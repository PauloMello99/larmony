import { Inject, Injectable } from "@nestjs/common";
import {
  STATEMENT_IMPORT_ADMIN_REPOSITORY,
  type CompleteJobPatch,
  type IStatementImportAdminRepository,
  type NewCandidateRow,
  type StatementImportAdminCategory,
} from "../../domain/statement-import-admin.repository.interface";
import type { CategoryConfidence, StatementImportCandidateType } from "../../domain/statement-import-candidate.entity";
import { DEFAULT_CATEGORY_CODES } from "../../domain/default-category-codes";
import { DispatchNotificationUseCase } from "../../../notifications/application/use-cases/dispatch-notification.use-case";

export interface StatementImportCallbackTransaction {
  externalId: string;
  date: string;
  amountCents: number;
  type: StatementImportCandidateType;
  description: string;
  categoryCode: string | null;
  categoryConfidence: CategoryConfidence;
  resolvedBy: string;
  merchantKey: string | null;
}

export interface StatementImportCallbackStats {
  total: number;
  resolvedByRules: number;
  resolvedByLlm: number;
  unresolved: number;
  processingMs: number;
}

// Espelha o corpo do callback do ADR-0034 — dois formatos distintos por
// `status`, nunca um único shape com tudo opcional (evita `!`/defaults
// inventados nos dois arms).
export type ProcessStatementImportCallbackInput =
  | {
      jobId: string;
      status: "completed";
      transactions: StatementImportCallbackTransaction[];
      stats: StatementImportCallbackStats;
    }
  | {
      jobId: string;
      status: "failed";
      errorCode: string;
      errorMessage: string;
    };

/**
 * Callback assíncrono do processor (sem RLS, DRIZZLE_ADMIN via
 * IStatementImportAdminRepository — sem sessão de usuário). Idempotente:
 * job desconhecido ou já terminal (callback duplicado) é no-op, mesmo
 * princípio dos webhooks Stripe (ADR-0026).
 */
@Injectable()
export class ProcessStatementImportCallbackUseCase {
  constructor(
    @Inject(STATEMENT_IMPORT_ADMIN_REPOSITORY)
    private readonly adminRepo: IStatementImportAdminRepository,
    private readonly dispatchNotification: DispatchNotificationUseCase,
  ) {}

  async execute(input: ProcessStatementImportCallbackInput): Promise<void> {
    const job = await this.adminRepo.findJobById(input.jobId);
    if (!job) return;

    if (input.status === "failed") {
      await this.fail(input.jobId, input.errorCode, input.errorMessage);
      return;
    }

    // ADR-0034: amountCents cruza a fronteira sempre positivo, direção só em
    // `type` — nunca coagir com Math.abs() aqui, isso esconderia um producer
    // fora do contrato (achado da revisão final). Rejeita o job inteiro em
    // vez de gravar um valor que inverteria silenciosamente somas de
    // orçamento/relatório.
    const amountSignError = input.transactions.find(
      (txn) => !Number.isInteger(txn.amountCents) || txn.amountCents <= 0,
    );
    if (amountSignError) {
      await this.fail(
        input.jobId,
        "INTERNAL_ERROR",
        `amountCents inválido em externalId=${amountSignError.externalId} (deve ser inteiro positivo — ADR-0034)`,
      );
      return;
    }

    const categories = await this.adminRepo.findCategories(job.householdId);
    const rows: NewCandidateRow[] = input.transactions.map((txn) => ({
      externalId: txn.externalId,
      date: txn.date,
      amountCents: txn.amountCents,
      type: txn.type,
      description: txn.description,
      categoryId: this.resolveCategoryId(txn.categoryCode, categories),
      categoryConfidence: txn.categoryConfidence,
      resolvedBy: txn.resolvedBy,
      merchantKey: txn.merchantKey,
    }));

    // completeJob + insertCandidates numa ÚNICA transação (achado da revisão
    // final: chamadas separadas deixavam uma janela onde um crash entre elas
    // gravava o job "completed" com zero candidatos, órfão — o sweep de
    // timeout só varre pending/processing, nunca alcança esse job).
    const { ok, job: updated } = await this.adminRepo.completeJobWithCandidates(
      input.jobId,
      { status: "completed", stats: input.stats, completedAt: new Date() },
      job.householdId,
      rows,
    );
    if (!ok || !updated) return;

    await this.dispatchNotification.execute({
      type: "statement_import_completed",
      total: input.stats.total,
      resolvedCount: input.stats.total - input.stats.unresolved,
      unresolvedCount: input.stats.unresolved,
      recipientUserIds: [updated.createdBy],
      householdId: updated.householdId,
    });
  }

  private async fail(jobId: string, errorCode: string, errorMessage: string): Promise<void> {
    const patch: CompleteJobPatch = { status: "failed", errorCode, errorMessage, completedAt: new Date() };
    const { ok, job: updated } = await this.adminRepo.completeJob(jobId, patch);
    if (!ok || !updated) return;

    await this.dispatchNotification.execute({
      type: "statement_import_failed",
      errorCode,
      recipientUserIds: [updated.createdBy],
      householdId: updated.householdId,
    });
  }

  // Categoria renomeada/apagada depois do envio do context (ou categoryCode
  // nulo direto) volta `categoryId: null` — revisão manual obrigatória, o
  // processor nunca inventa/cria categoria (ADR-0034).
  private resolveCategoryId(
    categoryCode: string | null,
    categories: StatementImportAdminCategory[],
  ): string | null {
    if (!categoryCode) return null;

    const name = DEFAULT_CATEGORY_CODES[categoryCode];
    if (!name) return null;

    const match = categories.find((category) => category.isDefault && category.name === name);
    return match?.id ?? null;
  }
}
