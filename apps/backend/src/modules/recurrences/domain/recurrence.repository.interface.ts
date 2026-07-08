import type { TransactionType } from "../../transactions/domain/transaction.entity";
import type { RecurrenceFrequency } from "./recurrence.entity";

export const RECURRENCE_REPOSITORY = Symbol("RECURRENCE_REPOSITORY");

/** Item de listagem do CRUD — categoria/pessoa resolvidas via JOIN. */
export interface RecurrenceListItem {
  id: string;
  householdId: string;
  createdBy: string;
  personId: string | null;
  personName: string | null;
  categoryId: string | null;
  categoryName: string | null;
  categoryColor: string | null;
  categoryIcon: string | null;
  type: TransactionType;
  amountCents: number;
  description: string;
  frequency: RecurrenceFrequency;
  interval: number;
  startDate: string;
  endDate: string | null;
  nextRunDate: string;
  isActive: boolean;
  notes: string | null;
}

export interface CreateRecurrenceData {
  createdBy: string;
  personId: string | null;
  categoryId?: string | null;
  type: TransactionType;
  amountCents: number;
  description: string;
  frequency: RecurrenceFrequency;
  interval: number;
  startDate: string;
  endDate?: string | null;
  /** Cursor inicial do engine (normalmente = startDate). */
  nextRunDate: string;
  notes?: string | null;
}

export interface UpdateRecurrenceData {
  personId?: string | null;
  categoryId?: string | null;
  type?: TransactionType;
  amountCents?: number;
  description?: string;
  frequency?: RecurrenceFrequency;
  interval?: number;
  startDate?: string;
  endDate?: string | null;
  nextRunDate?: string;
  isActive?: boolean;
  notes?: string | null;
}

/** Regra vencida devolvida ao engine (só o necessário para gerar a transação). */
export interface DueRecurrence {
  id: string;
  householdId: string;
  createdBy: string;
  personId: string | null;
  categoryId: string | null;
  type: TransactionType;
  amountCents: number;
  description: string;
  frequency: RecurrenceFrequency;
  interval: number;
  endDate: string | null;
  nextRunDate: string;
}

export interface IRecurrenceRepository {
  // ─── CRUD (request-scoped, RLS-enforced) ───
  findAllByHousehold(householdId: string): Promise<RecurrenceListItem[]>;
  findById(id: string, householdId: string): Promise<RecurrenceListItem | null>;
  create(householdId: string, data: CreateRecurrenceData): Promise<RecurrenceListItem>;
  update(id: string, householdId: string, data: UpdateRecurrenceData): Promise<RecurrenceListItem>;
  delete(id: string, householdId: string): Promise<void>;

  // ─── Engine (cron, sem request context → conexão admin) ───
  /** Regras ativas com `next_run_date <= today` (ISO). */
  findDue(today: string): Promise<DueRecurrence[]>;
  /** Avança o cursor da regra (persistido ANTES de gerar a transação). */
  advanceNextRun(id: string, nextRunDate: string): Promise<void>;
  /** Encerra a série (isActive=false) — usada ao ultrapassar `endDate`. */
  deactivate(id: string): Promise<void>;
}
