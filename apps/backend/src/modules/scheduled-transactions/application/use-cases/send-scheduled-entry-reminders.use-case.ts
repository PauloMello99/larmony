import { Inject, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { daysBetween, nextManualOccurrence } from "../../../../common/finance/due-date";
import { NotificationService } from "../../../notifications/application/notification.service";
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
 * Guarda anti-duplicata: já enviou lembrete desta entrada NO DIA-CALENDÁRIO de
 * `now`? (Antes: dedup por MÊS, correto só para cadência mensal — o gatilho
 * `daysUntil === reminderDaysBefore` cai em exatamente 1 dia por ocorrência
 * para QUALQUER cadência, então dedup por dia é o guarda correto e genérico —
 * byte-idêntico ao antigo para mensal, e agora também correto p/ weekly/yearly.)
 */
export function alreadySentToday(entry: ScheduledEntryEntity, now: Date): boolean {
  const last = entry.reminderLastSentAt;
  if (!last) return false;
  return (
    last.getFullYear() === now.getFullYear() &&
    last.getMonth() === now.getMonth() &&
    last.getDate() === now.getDate()
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
    private readonly notifications: NotificationService,
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

      const due = nextManualOccurrence(entry.startDate, now, entry.frequency, entry.interval);
      const daysUntil = daysBetween(now, due);
      if (daysUntil !== entry.reminderDaysBefore) continue;

      if (alreadySentToday(entry, now)) {
        result.skippedDedup++;
        continue;
      }

      // Guarda gravada antes do envio: repetição do tick nunca re-envia.
      await this.entries.markReminderSent(entry.id, now);

      const memberIds = await this.entries.findHouseholdMemberUserIds(entry.householdId);
      const amount = (entry.amountCents / 100).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
      });
      const when =
        daysUntil === 0 ? "vence hoje" : `vence em ${daysUntil} dia${daysUntil > 1 ? "s" : ""}`;
      const frontendUrl = this.config.get<string>("FRONTEND_URL") ?? "";

      for (const userId of memberIds) {
        await this.notifications.notify({
          userId,
          householdId: entry.householdId,
          type: "bill_reminder",
          title: `Lançamento "${entry.description}" ${when}`,
          body: `Valor: ${amount}. Vencimento no dia ${due.getDate()}.`,
          data: { scheduledTransactionEntryId: entry.id, dueDate: due.toISOString().slice(0, 10) },
          actionUrl: frontendUrl
            ? `${frontendUrl}/households/${entry.householdSlug}/scheduled-transactions`
            : undefined,
          actionLabel: "Ver lançamentos",
        });
      }

      result.sent++;
      this.logger.log(
        `Lembrete enviado: entrada="${entry.description}" (${entry.id}) → ${memberIds.length} membro(s)`,
      );
    }

    return result;
  }
}
