import { BillEntity } from "./bill.entity";

export const BILL_REPOSITORY = Symbol("BILL_REPOSITORY");

export interface IBillRepository {
  /**
   * Todas as bills ATIVAS com lembrete configurado (reminder_days_before não
   * nulo), com o slug do household. A janela de disparo/dedup é decidida no
   * use-case (testável com fakes).
   */
  findActiveWithReminder(): Promise<BillEntity[]>;

  /** Marca o envio do lembrete (guarda anti-duplicata bill×mês). */
  markReminderSent(billId: string, at: Date): Promise<void>;

  /** User ids (public.users.id) dos membros ativos do household. */
  findHouseholdMemberUserIds(householdId: string): Promise<string[]>;
}
