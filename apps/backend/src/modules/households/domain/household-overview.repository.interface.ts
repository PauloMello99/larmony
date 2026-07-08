export const HOUSEHOLD_OVERVIEW_REPOSITORY = Symbol("HOUSEHOLD_OVERVIEW_REPOSITORY");

export interface MonthTotals {
  incomeCents: number;
  expenseCents: number;
  balanceCents: number;
}

export interface UpcomingBill {
  id: string;
  name: string;
  amountCents: number;
  dueDate: string; // ISO date
  daysUntilDue: number;
}

export interface RecentTransaction {
  id: string;
  description: string;
  amountCents: number;
  type: "income" | "expense";
  date: string; // ISO date
  categoryName: string | null;
  categoryColor: string | null;
}

export interface BudgetProgress {
  id: string;
  categoryName: string;
  categoryColor: string;
  limitCents: number;
  spentCents: number;
}

export interface GoalProgress {
  id: string;
  name: string;
  color: string;
  savedCents: number;
  targetCents: number;
}

export interface HouseholdOverviewData {
  currentMonth: MonthTotals;
  previousMonth: MonthTotals;
  goals: { savedCents: number; activeCount: number; top: GoalProgress[] };
  upcomingBills: UpcomingBill[];
  recentTransactions: RecentTransaction[];
  budgets: BudgetProgress[];
}

export interface IHouseholdOverviewRepository {
  getOverview(householdId: string, now: Date): Promise<HouseholdOverviewData>;
}
