import type { TransactionFilters } from '@/api/transactions'

export const queryKeys = {
  transactions: {
    all: (householdId: string) => ['transactions', householdId] as const,
    list: (householdId: string, filters: TransactionFilters) =>
      [...queryKeys.transactions.all(householdId), filters] as const,
    summaryAll: (householdId: string) => ['transaction-summary', householdId] as const,
    summary: (householdId: string, month: number, year: number) =>
      [...queryKeys.transactions.summaryAll(householdId), month, year] as const,
  },
  categories: {
    all: (householdId: string) => ['categories', householdId] as const,
  },
  bills: {
    all: (householdId: string) => ['bills', householdId] as const,
  },
  budgets: {
    all: (householdId: string) => ['budgets', householdId] as const,
    list: (householdId: string, month: number, year: number) =>
      [...queryKeys.budgets.all(householdId), month, year] as const,
    spendingAll: (householdId: string) => ['budget-spending', householdId] as const,
    spending: (householdId: string, month: number, year: number) =>
      [...queryKeys.budgets.spendingAll(householdId), month, year] as const,
  },
  goals: {
    all: (householdId: string) => ['goals', householdId] as const,
    contributions: (goalId: string) => ['goal-contributions', goalId] as const,
  },
  members: {
    all: (householdId: string) => ['members', householdId] as const,
  },
}
