"use client"

import { useQuery } from "@tanstack/react-query"
import { apiRequest } from "@/infrastructure/api/client"
import { queryKeys } from "@/infrastructure/query/query-keys"
import type { TransactionFilters, TransactionListResponse } from "../types"

function buildQuery(filters: TransactionFilters): string {
  const params = new URLSearchParams()
  if (filters.month) params.set("month", String(filters.month))
  if (filters.year) params.set("year", String(filters.year))
  if (filters.type) params.set("type", filters.type)
  if (filters.categoryId) params.set("categoryId", filters.categoryId)
  const qs = params.toString()
  return qs ? `?${qs}` : ""
}

export function useTransactions(householdId: string, filters: TransactionFilters) {
  const query = useQuery({
    queryKey: queryKeys.transactions.list(householdId, { ...filters }),
    queryFn: () =>
      apiRequest<TransactionListResponse>(
        `/households/${householdId}/transactions${buildQuery(filters)}`,
      ),
    enabled: !!householdId,
  })

  return {
    transactions: query.data?.items ?? [],
    total: query.data?.total ?? 0,
    loading: query.isLoading,
    error: query.error instanceof Error ? query.error.message : null,
  }
}
