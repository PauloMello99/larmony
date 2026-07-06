"use client"

import { useQuery } from "@tanstack/react-query"
import { apiRequest } from "@/infrastructure/api/client"
import { queryKeys } from "@/infrastructure/query/query-keys"
import type { Budget, BudgetFilters } from "../types"

export function useBudgets(householdId: string, filters: BudgetFilters) {
  const query = useQuery({
    queryKey: queryKeys.budgets.list(householdId, { ...filters }),
    queryFn: () =>
      apiRequest<Budget[]>(
        `/households/${householdId}/budgets?month=${filters.month}&year=${filters.year}`,
      ),
    enabled: !!householdId,
  })

  return {
    budgets: query.data ?? [],
    loading: query.isLoading,
    error: query.error instanceof Error ? query.error.message : null,
  }
}
