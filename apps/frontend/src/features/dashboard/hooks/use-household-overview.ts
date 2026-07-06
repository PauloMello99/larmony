"use client"

import { useQuery } from "@tanstack/react-query"
import { apiRequest } from "@/infrastructure/api/client"
import { queryKeys } from "@/infrastructure/query/query-keys"

export interface MonthTotals {
  incomeCents: number
  expenseCents: number
  balanceCents: number
}

export interface UpcomingBill {
  id: string
  name: string
  amountCents: number
  dueDate: string
  daysUntilDue: number
}

export interface RecentTransaction {
  id: string
  description: string
  amountCents: number
  type: "income" | "expense"
  date: string
  categoryName: string | null
  categoryColor: string | null
}

export interface BudgetProgress {
  id: string
  categoryName: string
  categoryColor: string
  limitCents: number
  spentCents: number
}

export interface GoalProgress {
  id: string
  name: string
  color: string
  savedCents: number
  targetCents: number
}

export interface HouseholdOverview {
  currentMonth: MonthTotals
  previousMonth: MonthTotals
  goals: { savedCents: number; activeCount: number; top: GoalProgress[] }
  upcomingBills: UpcomingBill[]
  recentTransactions: RecentTransaction[]
  budgets: BudgetProgress[]
}

/** KPIs reais do lar (GET /households/:id/overview) — zeros/vazio até o M2. */
export function useHouseholdOverview(householdId: string) {
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.households.overview(householdId),
    queryFn: () => apiRequest<HouseholdOverview>(`/households/${householdId}/overview`),
    enabled: !!householdId,
  })

  return { overview: data, loading: isLoading }
}

/** Variação percentual vs. mês anterior (null = sem base de comparação). */
export function trendPercent(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? null : 100
  return Math.round(((current - previous) / Math.abs(previous)) * 100)
}
