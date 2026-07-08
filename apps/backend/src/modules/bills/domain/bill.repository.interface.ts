import { BillEntity } from "./bill.entity";

export const BILL_REPOSITORY = Symbol("BILL_REPOSITORY");

/** Item de listagem do CRUD — categoria resolvida via JOIN + vencimento derivado. */
export interface BillListItem {
  id: string;
  householdId: string;
  categoryId: string | null;
  categoryName: string | null;
  categoryColor: string | null;
  categoryIcon: string | null;
  name: string;
  amountCents: number;
  dueDay: number;
  isActive: boolean;
  notes: string | null;
  reminderDaysBefore: number | null;
  /** Próximo vencimento (ISO) e dias até lá — calculados a partir de `dueDay`. */
  dueDate: string;
  daysUntilDue: number;
}

export interface CreateBillData {
  name: string;
  amountCents: number;
  dueDay: number;
  categoryId?: string | null;
  isActive?: boolean;
  reminderDaysBefore?: number | null;
  notes?: string | null;
}

export interface UpdateBillData {
  name?: string;
  amountCents?: number;
  dueDay?: number;
  categoryId?: string | null;
  isActive?: boolean;
  reminderDaysBefore?: number | null;
  notes?: string | null;
}

/** Bill mínima para o launch — só o necessário pra lançar como transação. */
export interface BillForLaunch {
  id: string;
  name: string;
  amountCents: number;
  categoryId: string | null;
}

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

  /** Todas as bills do lar (ativas+inativas), com vencimento calculado a partir de `now`. */
  findAllByHousehold(householdId: string, now: Date): Promise<BillListItem[]>;

  findForLaunch(id: string, householdId: string): Promise<BillForLaunch | null>;

  create(householdId: string, data: CreateBillData): Promise<BillListItem>;

  update(id: string, householdId: string, data: UpdateBillData): Promise<BillListItem>;

  delete(id: string, householdId: string): Promise<void>;
}
