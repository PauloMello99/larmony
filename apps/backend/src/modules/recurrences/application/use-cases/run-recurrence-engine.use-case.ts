import { Inject, Injectable, Logger } from "@nestjs/common";
import { toISODate } from "../../../../common/finance/due-date";
import { CreateGeneratedTransactionUseCase } from "../../../transactions/application/use-cases/create-generated-transaction.use-case";
import {
  advanceRecurrenceDate,
  MAX_SCHEDULE_STEPS,
} from "../../domain/recurrence-schedule";
import {
  IRecurrenceRepository,
  RECURRENCE_REPOSITORY,
  type DueRecurrence,
} from "../../domain/recurrence.repository.interface";

export interface RunRecurrenceEngineResult {
  /** Regras vencidas avaliadas neste tick. */
  scanned: number;
  /** Transações geradas no total. */
  generated: number;
  /** Regras encerradas por ultrapassar o endDate. */
  deactivated: number;
}

/**
 * Engine de recorrência (M9): a cada tick do cron gera as transações das regras
 * vencidas (`next_run_date <= hoje`). Roda fora de request context, então grava
 * via caminho admin (CreateGeneratedTransactionUseCase → DRIZZLE_ADMIN) e o
 * repositório usa a conexão admin.
 *
 * Idempotência sem transação cross-repo: **avança o cursor ANTES de inserir**
 * (mesmo princípio do markReminderSent de bills). Um crash entre as duas
 * escritas PULA uma ocorrência (gap visível e corrigível) em vez de DUPLICAR
 * (que corromperia relatórios/orçamentos silenciosamente).
 *
 * Loop de catch-up bounded por regra: cobre ticks perdidos; ao atingir o teto
 * de segurança, LOGA (nunca silencia) e segue para a próxima regra.
 */
@Injectable()
export class RunRecurrenceEngineUseCase {
  private readonly logger = new Logger(RunRecurrenceEngineUseCase.name);

  constructor(
    @Inject(RECURRENCE_REPOSITORY)
    private readonly recurrenceRepo: IRecurrenceRepository,
    private readonly createGenerated: CreateGeneratedTransactionUseCase,
  ) {}

  async execute(now: Date = new Date()): Promise<RunRecurrenceEngineResult> {
    const today = toISODate(now);
    const due = await this.recurrenceRepo.findDue(today);

    const result: RunRecurrenceEngineResult = {
      scanned: due.length,
      generated: 0,
      deactivated: 0,
    };

    for (const rule of due) {
      result.generated += await this.runRule(rule, today, result);
    }

    if (result.generated > 0 || result.deactivated > 0) {
      this.logger.log(
        `Recurrence engine: scanned=${result.scanned} generated=${result.generated} deactivated=${result.deactivated}`,
      );
    }

    return result;
  }

  /** Gera todas as ocorrências vencidas de UMA regra (catch-up). */
  private async runRule(
    rule: DueRecurrence,
    today: string,
    result: RunRecurrenceEngineResult,
  ): Promise<number> {
    let cursor = rule.nextRunDate;
    let generated = 0;
    let steps = 0;

    while (cursor <= today) {
      // Passou do fim da série → encerra sem gerar.
      if (rule.endDate && cursor > rule.endDate) {
        await this.recurrenceRepo.deactivate(rule.id);
        result.deactivated++;
        break;
      }

      if (steps >= MAX_SCHEDULE_STEPS) {
        this.logger.warn(
          `Recurrence ${rule.id} atingiu o teto de ${MAX_SCHEDULE_STEPS} ocorrências num tick; ` +
            `restam ocorrências até ${today} para o próximo tick (cursor=${cursor}).`,
        );
        break;
      }

      const occurrenceDate = cursor;
      const next = advanceRecurrenceDate(cursor, rule.frequency, rule.interval);

      // Avança o cursor ANTES de inserir (gaps-over-dups).
      await this.recurrenceRepo.advanceNextRun(rule.id, next);
      await this.createGenerated.execute(rule.householdId, {
        recurrenceId: rule.id,
        createdBy: rule.createdBy,
        personId: rule.personId,
        categoryId: rule.categoryId,
        type: rule.type,
        amountCents: rule.amountCents,
        description: rule.description,
        date: occurrenceDate,
        notes: null,
      });

      cursor = next;
      generated++;
      steps++;
    }

    return generated;
  }
}
