import { Inject, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { daysBetween, nextDueDate } from "../../../../common/finance/due-date";
import { NotificationService } from "../../../notifications/application/notification.service";
import { BillEntity } from "../../domain/bill.entity";
import {
  BILL_REPOSITORY,
  type IBillRepository,
} from "../../domain/bill.repository.interface";

export interface SendBillRemindersResult {
  /** Bills ativas com lembrete configurado avaliadas neste tick. */
  scanned: number;
  /** Lembretes enviados (1 por bill; notifica todos os membros do lar). */
  sent: number;
  /** Bills na janela de disparo puladas pela guarda mensal (dedup bill×mês). */
  skippedDedup: number;
}

// Reexportado para compat dos specs existentes (fonte única em common/finance).
export { nextDueDate } from "../../../../common/finance/due-date";

/** Guarda anti-duplicata: já enviou lembrete desta bill no mês-calendário de `now`? */
export function alreadySentThisMonth(bill: BillEntity, now: Date): boolean {
  const last = bill.reminderLastSentAt;
  if (!last) return false;
  return (
    last.getFullYear() === now.getFullYear() && last.getMonth() === now.getMonth()
  );
}

/**
 * Job de lembrete de contas (fatia cron do M7 — ver domain-rules §bills):
 * dispara quando faltam exatamente `reminderDaysBefore` dias para o próximo
 * vencimento, no máximo 1 vez por bill por mês-calendário (contexto de dedup =
 * bill × mês). O `markReminderSent` acontece ANTES do envio — e-mail é
 * best-effort e nunca duplica.
 */
@Injectable()
export class SendBillRemindersUseCase {
  private readonly logger = new Logger(SendBillRemindersUseCase.name);

  constructor(
    @Inject(BILL_REPOSITORY) private readonly bills: IBillRepository,
    private readonly notifications: NotificationService,
    private readonly config: ConfigService,
  ) {}

  async execute(now: Date = new Date()): Promise<SendBillRemindersResult> {
    const candidates = await this.bills.findActiveWithReminder();
    const result: SendBillRemindersResult = {
      scanned: candidates.length,
      sent: 0,
      skippedDedup: 0,
    };

    for (const bill of candidates) {
      if (bill.reminderDaysBefore === null) continue;

      const due = nextDueDate(bill.dueDay, now);
      const daysUntil = daysBetween(now, due);
      if (daysUntil !== bill.reminderDaysBefore) continue;

      if (alreadySentThisMonth(bill, now)) {
        result.skippedDedup++;
        continue;
      }

      // Guarda gravada antes do envio: repetição do tick nunca re-envia.
      await this.bills.markReminderSent(bill.id, now);

      const memberIds = await this.bills.findHouseholdMemberUserIds(bill.householdId);
      const amount = (bill.amountCents / 100).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
      });
      const when =
        daysUntil === 0 ? "vence hoje" : `vence em ${daysUntil} dia${daysUntil > 1 ? "s" : ""}`;
      const frontendUrl = this.config.get<string>("FRONTEND_URL") ?? "";

      for (const userId of memberIds) {
        await this.notifications.notify({
          userId,
          householdId: bill.householdId,
          type: "bill_reminder",
          title: `Conta "${bill.name}" ${when}`,
          body: `Valor: ${amount}. Vencimento no dia ${due.getDate()}.`,
          data: { billId: bill.id, dueDate: due.toISOString().slice(0, 10) },
          actionUrl: frontendUrl
            ? `${frontendUrl}/dashboard/household/${bill.householdSlug}/bills`
            : undefined,
          actionLabel: "Ver contas",
        });
      }

      result.sent++;
      this.logger.log(
        `Lembrete enviado: bill="${bill.name}" (${bill.id}) → ${memberIds.length} membro(s)`,
      );
    }

    return result;
  }
}
