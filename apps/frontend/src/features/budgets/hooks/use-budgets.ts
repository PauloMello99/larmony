"use client"

import { useQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { apiRequest } from "@/infrastructure/api/client"
import { queryKeys } from "@/infrastructure/query/query-keys"
import { translateApiError } from "@/shared/lib/api-error"
import type { Budget, BudgetFilters } from "../types"

export function useBudgets(householdId: string, filters: BudgetFilters) {
  const { t } = useTranslation("common")
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
    error: query.error instanceof Error ? translateApiError(query.error, t) : null,
  }
}
