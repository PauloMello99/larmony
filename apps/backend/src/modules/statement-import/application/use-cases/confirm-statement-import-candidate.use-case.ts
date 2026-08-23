import { Inject, Injectable } from "@nestjs/common";
import {
  STATEMENT_IMPORT_CANDIDATE_REPOSITORY,
  type IStatementImportCandidateRepository,
} from "../../domain/statement-import-candidate.repository.interface";
import {
  MERCHANT_CATEGORY_MEMORY_REPOSITORY,
  type IMerchantCategoryMemoryRepository,
} from "../../domain/merchant-category-memory.repository.interface";
import { StatementImportCandidateNotFoundException } from "../../domain/exceptions/statement-import-candidate-not-found.exception";
import { StatementImportCandidateNotPendingException } from "../../domain/exceptions/statement-import-candidate-not-pending.exception";
import { CreateTransactionUseCase } from "../../../transactions/application/use-cases/create-transaction.use-case";
import type { TransactionEntity } from "../../../transactions/domain/transaction.entity";

export interface ConfirmStatementImportCandidateInput {
  categoryId?: string;
}

/**
 * Confirma um candidato em revisão: cria a transaction real via
 * CreateTransactionUseCase (sem novo caminho de escrita, ADR-0034) e, se o
 * usuário corrigiu a categoria sugerida, grava a correção em
 * merchant_category_memory — é essa correção que a Fase 2 aprende (null→
 * categoria é o caso mais importante, mas trocar sugestão por outra também
 * conta). Confirmar sem alterar a categoria sugerida não grava memória
 * (nada mudou).
 */
@Injectable()
export class ConfirmStatementImportCandidateUseCase {
  constructor(
    @Inject(STATEMENT_IMPORT_CANDIDATE_REPOSITORY)
    private readonly candidateRepo: IStatementImportCandidateRepository,
    @Inject(MERCHANT_CATEGORY_MEMORY_REPOSITORY)
    private readonly memoryRepo: IMerchantCategoryMemoryRepository,
    private readonly createTransaction: CreateTransactionUseCase,
  ) {}

  async execute(
    candidateId: string,
    householdId: string,
    authId: string,
    userId: string,
    input: ConfirmStatementImportCandidateInput,
  ): Promise<TransactionEntity> {
    const candidate = await this.candidateRepo.findById(candidateId, householdId);
    if (!candidate) throw new StatementImportCandidateNotFoundException(candidateId);
    if (candidate.status !== "pending_review") {
      throw new StatementImportCandidateNotPendingException(candidateId);
    }

    const finalCategoryId = input.categoryId ?? candidate.categoryId ?? undefined;

    const transaction = await this.createTransaction.execute(householdId, authId, userId, {
      type: candidate.type,
      amountCents: candidate.amountCents,
      description: candidate.description,
      date: candidate.date,
      categoryId: finalCategoryId,
    });

    await this.candidateRepo.markConfirmed(candidateId, householdId, transaction.id);

    if (
      candidate.merchantKey != null &&
      finalCategoryId != null &&
      finalCategoryId !== candidate.categoryId
    ) {
      await this.memoryRepo.upsert(householdId, candidate.merchantKey, finalCategoryId);
    }

    return transaction;
  }
}
