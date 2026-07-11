export const REPORT_REPOSITORY = Symbol("REPORT_REPOSITORY");

export interface MonthPoint {
  year: number;
  month: number;
  incomeCents: number;
  expenseCents: number;
}

export interface MonthTotals {
  incomeCents: number;
  expenseCents: number;
  balanceCents: number;
}

export interface CategorySlice {
  categoryId: string | null;
  name: string;
  color: string;
  amountCents: number;
}

export interface PersonSlice {
  userId: string | null;
  name: string;
  amountCents: number;
}

export interface MonthlyReport {
  months: MonthPoint[];
  byCategory: CategorySlice[];
  byPerson: PersonSlice[];
  refMonth: { month: number; year: number };
}

export interface AnnualReport {
  year: number;
  months: MonthPoint[];
  totals: MonthTotals;
}

export interface IReportRepository {
  getMonthlyReport(householdId: string, now: Date): Promise<MonthlyReport>;
  getAnnualReport(householdId: string, year: number): Promise<AnnualReport>;

  // ─── Cron (relatório mensal, sem request context → conexão admin) ───
  /** IDs de households não suspensos — universo do job `monthly-report`. */
  findAllActiveHouseholdIds(): Promise<string[]>;
  /** Mesma agregação de `getMonthlyReport`, via DRIZZLE_ADMIN. */
  getMonthlyReportAdmin(householdId: string, now: Date): Promise<MonthlyReport>;
  /** User ids (public.users.id) dos membros ativos do household. */
  findHouseholdMemberUserIds(householdId: string): Promise<string[]>;
}
