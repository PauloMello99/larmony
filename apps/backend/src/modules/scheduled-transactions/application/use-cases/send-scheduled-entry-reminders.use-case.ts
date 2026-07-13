import { Inject, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { daysBetween, nextManualOccurrence } from "../../../../common/finance/due-date";
import { localHour, zonedNow } from "../../../../common/time/tz-clock";
import { DispatchNotificationUseCase } from "../../../notifications/application/use-cases/dispatch-notification.use-case";
import { ScheduledEntryEntity } from "../../domain/scheduled-entry.entity";
import {
  IScheduledEntryRepository,
  SCHEDULED_ENTRY_REPOSITORY,
} from "../../domain/scheduled-entry.repository.interface";

export interface SendScheduledEntryRemindersResult {
  /** Entradas manuais com lembrete configurado avaliadas neste tick. */
  scanned: number;
  /** Lembretes enviados (1 por entrada; notifica todos os membros do lar). */
  sent: number;
  /** Entradas na janela de disparo puladas pela guarda diária (dedup por dia). */
  skippedDedup: number;
}

/**
 * Guarda anti-duplicata: já enviou lembrete desta entrada NO DIA-CALENDÁRIO
 * LOCAL DO LAR (M12)? O gatilho `daysUntil === reminderDaysBefore` cai em
 * exatamente 1 dia por ocorrência para qualquer cadência, então dedup por dia
 * local é o guarda correto. Tanto `reminderLastSentAt` (instante) quanto `now`
 * são reexpressos no fuso do lar antes de comparar y/m/d — nunca getters crus.
 */
export function alreadySentToday(entry: ScheduledEntryEntity, now: Date, timezone: string): boolean {
  const last = entry.reminderLastSentAt;
  if (!last) return false;
  const lastLocal = zonedNow(timezone, last);
  const nowLocal = zonedNow(timezone, now);
  return (
    lastLocal.getFullYear() === nowLocal.getFullYear() &&
    lastLocal.getMonth() === nowLocal.getMonth() &&
    lastLocal.getDate() === nowLocal.getDate()
  );
}

/**
 * Job de lembrete dos lançamentos programados no modo `manual` (ex-M7
 * send-bill-reminders, generalizado p/ ADR-0020): dispara quando faltam
 * exatamente `reminderDaysBefore` dias para a próxima ocorrência (calculada
 * estatelessmente via `nextManualOccurrence` — modo manual não tem cursor), no
 * máximo 1 vez por entrada por dia-calendário. `markReminderSent` acontece
 * ANTES do envio — e-mail é best-effort e nunca duplica.
 */
@Injectable()
export class SendScheduledEntryRemindersUseCase {
  private readonly logger = new Logger(SendScheduledEntryRemindersUseCase.name);

  constructor(
    @Inject(SCHEDULED_ENTRY_REPOSITORY)
    private readonly entries: IScheduledEntryRepository,
    private readonly dispatch: DispatchNotificationUseCase,
    private readonly config: ConfigService,
  ) {}

  async execute(now: Date = new Date()): Promise<SendScheduledEntryRemindersResult> {
    const candidates = await this.entries.findActiveWithReminder();
    const result: SendScheduledEntryRemindersResult = {
      scanned: candidates.length,
      sent: 0,
      skippedDedup: 0,
    };

    for (const entry of candidates) {
      if (entry.reminderDaysBefore === null) continue;

      // Tudo avaliado no fuso do lar (M12): o "hoje" e a hora são locais.
      const tz = entry.householdTimezone;
      const nowLocal = zonedNow(tz, now);

      const due = nextManualOccurrence(entry.startDate, nowLocal, entry.frequency, entry.interval);
      const daysUntil = daysBetween(nowLocal, due);
      if (daysUntil !== entry.reminderDaysBefore) continue;

      // Gate de hora: só a partir da hora preferida local do lar (>=, tolera
      // atraso de tick; a dedup diária impede reenvio nos ticks seguintes).
      if (localHour(tz, now) < entry.householdNotificationHour) continue;

      if (alreadySentToday(entry, now, tz)) {
        result.skippedDedup++;
        continue;
      }

      // Guarda gravada antes do envio: repetição do tick nunca re-envia.
      await this.entries.markReminderSent(entry.id, now);

      const memberIds = await this.entries.findHouseholdMemberUserIds(entry.householdId);
      const frontendUrl = this.config.get<string>("FRONTEND_URL") ?? "";

      // actionLabel ("Ver lançamentos") vem do catálogo i18n — aqui só o actionUrl.
      await this.dispatch.execute({
        recipientUserIds: memberIds,
        householdId: entry.householdId,
        type: "bill_reminder",
        description: entry.description,
        amountCents: entry.amountCents,
        daysUntil,
        dueDay: due.getDate(),
        data: { scheduledTransactionEntryId: entry.id, dueDate: due.toISOString().slice(0, 10) },
        actionUrl: frontendUrl
          ? `${frontendUrl}/households/${entry.householdSlug}/scheduled-transactions`
          : undefined,
      });

      result.sent++;
      this.logger.log(
        `Lembrete enviado: entrada="${entry.description}" (${entry.id}) → ${memberIds.length} membro(s)`,
      );
    }

    return result;
  }
}
