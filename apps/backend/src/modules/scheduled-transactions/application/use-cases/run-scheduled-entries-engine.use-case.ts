import { Inject, Injectable, Logger } from "@nestjs/common";
import { toISODate } from "../../../../common/finance/due-date";
import { CreateGeneratedTransactionUseCase } from "../../../transactions/application/use-cases/create-generated-transaction.use-case";
import { DispatchNotificationUseCase } from "../../../notifications/application/use-cases/dispatch-notification.use-case";
import {
  advanceScheduledEntryDate,
  MAX_SCHEDULE_STEPS,
} from "../../domain/scheduled-entry-schedule";
import {
  IScheduledEntryRepository,
  SCHEDULED_ENTRY_REPOSITORY,
  type DueScheduledEntry,
} from "../../domain/scheduled-entry.repository.interface";

export interface RunScheduledEntriesEngineResult {
  /** Regras (modo auto) vencidas avaliadas neste tick. */
  scanned: number;
  /** Transações geradas no total. */
  generated: number;
  /** Regras encerradas por ultrapassar o endDate. */
  deactivated: number;
}

/**
 * Engine de geração automática (ADR-0020, ex-M9 recurrence-engine): a cada
 * tick do cron gera as transações das entradas `auto` vencidas
 * (`next_run_date <= hoje`). Roda fora de request context, então grava via
 * caminho admin (CreateGeneratedTransactionUseCase → DRIZZLE_ADMIN) e o
 * repositório usa a conexão admin.
 *
 * Idempotência sem transação cross-repo: **avança o cursor ANTES de inserir**
 * (mesmo princípio do markReminderSent das entradas manuais). Um crash entre
 * as duas escritas PULA uma ocorrência (gap visível e corrigível) em vez de
 * DUPLICAR (que corromperia relatórios/orçamentos silenciosamente).
 *
 * Loop de catch-up bounded por regra: cobre ticks perdidos; ao atingir o teto
 * de segurança, LOGA (nunca silencia) e segue para a próxima regra.
 */
@Injectable()
export class RunScheduledEntriesEngineUseCase {
  private readonly logger = new Logger(RunScheduledEntriesEngineUseCase.name);

  constructor(
    @Inject(SCHEDULED_ENTRY_REPOSITORY)
    private readonly entryRepo: IScheduledEntryRepository,
    private readonly createGenerated: CreateGeneratedTransactionUseCase,
    private readonly dispatch: DispatchNotificationUseCase,
  ) {}

  async execute(now: Date = new Date()): Promise<RunScheduledEntriesEngineResult> {
    const today = toISODate(now);
    const due = await this.entryRepo.findDue(today);

    const result: RunScheduledEntriesEngineResult = {
      scanned: due.length,
      generated: 0,
      deactivated: 0,
    };

    for (const rule of due) {
      result.generated += await this.runRule(rule, today, result);
    }

    if (result.generated > 0 || result.deactivated > 0) {
      this.logger.log(
        `Scheduled entries engine: scanned=${result.scanned} generated=${result.generated} deactivated=${result.deactivated}`,
      );
    }

    return result;
  }

  /** Gera todas as ocorrências vencidas de UMA regra (catch-up). */
  private async runRule(
    rule: DueScheduledEntry,
    today: string,
    result: RunScheduledEntriesEngineResult,
  ): Promise<number> {
    let cursor = rule.nextRunDate;
    let generated = 0;
    let steps = 0;

    // Membros do lar resolvidos 1x, não a cada ocorrência do catch-up.
    const memberIds = await this.entryRepo.findHouseholdMemberUserIds(rule.householdId);

    while (cursor <= today) {
      // Passou do fim da série → encerra sem gerar.
      if (rule.endDate && cursor > rule.endDate) {
        await this.entryRepo.deactivate(rule.id);
        result.deactivated++;
        break;
      }

      if (steps >= MAX_SCHEDULE_STEPS) {
        this.logger.warn(
          `Scheduled entry ${rule.id} atingiu o teto de ${MAX_SCHEDULE_STEPS} ocorrências num tick; ` +
            `restam ocorrências até ${today} para o próximo tick (cursor=${cursor}).`,
        );
        break;
      }

      const occurrenceDate = cursor;
      const next = advanceScheduledEntryDate(cursor, rule.frequency, rule.interval);

      // Avança o cursor ANTES de inserir (gaps-over-dups).
      await this.entryRepo.advanceNextRun(rule.id, next);
      await this.createGenerated.execute(rule.householdId, {
        scheduledTransactionEntryId: rule.id,
        createdBy: rule.createdBy,
        personId: rule.personId,
        categoryId: rule.categoryId,
        type: rule.type,
        amountCents: rule.amountCents,
        description: rule.description,
        date: occurrenceDate,
        notes: null,
      });

      // Sem marcador de dedup — idempotência é estrutural (cursor avança antes
      // do insert; 1 ocorrência = 1 insert = 1 notificação).
      await this.dispatch.execute({
        recipientUserIds: memberIds,
        householdId: rule.householdId,
        type: "auto_launch",
        description: rule.description,
        amountCents: rule.amountCents,
        date: occurrenceDate,
        data: { scheduledTransactionEntryId: rule.id },
      });

      cursor = next;
      generated++;
      steps++;
    }

    return generated;
  }
}
