import type { TransactionType } from "../../transactions/domain/transaction.entity";
import type {
  ScheduledEntryEntity,
  ScheduledEntryFrequency,
  ScheduledEntryPostingMode,
} from "./scheduled-entry.entity";

export const SCHEDULED_ENTRY_REPOSITORY = Symbol("SCHEDULED_ENTRY_REPOSITORY");

/** Item de listagem do CRUD — categoria/pessoa resolvidas via JOIN. */
export interface ScheduledEntryListItem {
  id: string;
  householdId: string;
  postingMode: ScheduledEntryPostingMode;
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
  frequency: ScheduledEntryFrequency;
  interval: number;
  startDate: string;
  endDate: string | null;
  isActive: boolean;
  notes: string | null;
  /** Cursor do engine — só modo `auto` (persistido). NULL no modo `manual`. */
  nextRunDate: string | null;
  /** Próxima ocorrência (ISO) e dias até lá — só modo `manual`, calculado a
   *  partir de `startDate`+cadência (stateless, sem cursor). NULL no modo `auto`
   *  (usar `nextRunDate` nesse caso). */
  dueDate: string | null;
  daysUntilDue: number | null;
  /** Dias antes da ocorrência p/ lembrete por e-mail — só modo `manual`. */
  reminderDaysBefore: number | null;
}

export interface CreateScheduledEntryData {
  postingMode: ScheduledEntryPostingMode;
  createdBy: string;
  personId: string | null;
  categoryId?: string | null;
  type: TransactionType;
  amountCents: number;
  description: string;
  frequency: ScheduledEntryFrequency;
  interval: number;
  startDate: string;
  endDate?: string | null;
  /** Cursor inicial do engine (= startDate) no modo `auto`; NULL no `manual`. */
  nextRunDate: string | null;
  reminderDaysBefore?: number | null;
  notes?: string | null;
}

export interface UpdateScheduledEntryData {
  postingMode?: ScheduledEntryPostingMode;
  personId?: string | null;
  categoryId?: string | null;
  type?: TransactionType;
  amountCents?: number;
  description?: string;
  frequency?: ScheduledEntryFrequency;
  interval?: number;
  endDate?: string | null;
  /** Gerido pelo use-case (toggle de modo/reativação) — nunca pelo cliente direto. */
  nextRunDate?: string | null;
  isActive?: boolean;
  reminderDaysBefore?: number | null;
  notes?: string | null;
}

/** Entrada mínima para o launch — só o necessário pra lançar como transação. */
export interface EntryForLaunch {
  id: string;
  postingMode: ScheduledEntryPostingMode;
  description: string;
  amountCents: number;
  categoryId: string | null;
  type: TransactionType;
}

/** Regra vencida devolvida ao engine (modo `auto`; só o necessário p/ gerar a tx). */
export interface DueScheduledEntry {
  id: string;
  householdId: string;
  /** Fuso IANA do lar (M12) — o engine avalia "vencido" no dia local do lar. */
  householdTimezone: string;
  createdBy: string;
  personId: string | null;
  categoryId: string | null;
  type: TransactionType;
  amountCents: number;
  description: string;
  frequency: ScheduledEntryFrequency;
  interval: number;
  endDate: string | null;
  nextRunDate: string;
}

export interface IScheduledEntryRepository {
  // ─── CRUD (request-scoped, RLS-enforced) ───
  findAllByHousehold(householdId: string, now: Date): Promise<ScheduledEntryListItem[]>;
  findById(id: string, householdId: string): Promise<ScheduledEntryListItem | null>;
  findForLaunch(id: string, householdId: string): Promise<EntryForLaunch | null>;
  create(householdId: string, data: CreateScheduledEntryData): Promise<ScheduledEntryListItem>;
  update(
    id: string,
    householdId: string,
    data: UpdateScheduledEntryData,
  ): Promise<ScheduledEntryListItem>;
  delete(id: string, householdId: string): Promise<void>;

  // ─── Engine (cron, modo auto, sem request context → conexão admin) ───
  /**
   * Regras `auto` ativas com `next_run_date <= upperBound` (ISO). `upperBound`
   * é um teto seguro (data local do fuso mais adiantado do mundo, UTC+14) — o
   * filtro fino "venceu no dia local DESTE lar" é aplicado em código pelo
   * engine, já que o corte difere por fuso do lar (M12). Traz `householdTimezone`.
   */
  findDue(upperBound: string): Promise<DueScheduledEntry[]>;
  /** Avança o cursor da regra (persistido ANTES de gerar a transação). */
  advanceNextRun(id: string, nextRunDate: string): Promise<void>;
  /** Encerra a série (isActive=false) — usada ao ultrapassar `endDate`. */
  deactivate(id: string): Promise<void>;

  // ─── Lembrete (cron, modo manual, sem request context → conexão admin) ───
  /** Entradas `manual` ATIVAS com lembrete configurado, com slug do household. */
  findActiveWithReminder(): Promise<ScheduledEntryEntity[]>;
  /** Marca o envio do lembrete (guarda anti-duplicata por dia). */
  markReminderSent(id: string, at: Date): Promise<void>;
  /** User ids (public.users.id) dos membros ativos do household. */
  findHouseholdMemberUserIds(householdId: string): Promise<string[]>;
}
