"use client"

import { useQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { apiRequest } from "@/infrastructure/api/client"
import { queryKeys } from "@/infrastructure/query/query-keys"
import { translateApiError } from "@/shared/lib/api-error"
import type { TransactionFilters, TransactionListResponse } from "../types"

function buildQuery(filters: TransactionFilters): string {
  const params = new URLSearchParams()
  if (filters.month) params.set("month", String(filters.month))
  if (filters.year) params.set("year", String(filters.year))
  if (filters.type) params.set("type", filters.type)
  if (filters.categoryId) params.set("categoryId", filters.categoryId)
  // Busca o mês inteiro (a paginação é client-side, ver usePagination). Sem
  // isto o backend aplicaria o default de 50 e cortaria meses cheios; 200 é o
  // teto do endpoint e cobre com folga um mês de um lar.
  params.set("limit", "200")
  return `?${params.toString()}`
}

export function useTransactions(householdId: string, filters: TransactionFilters) {
  const { t } = useTranslation("common")
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
    error: query.error instanceof Error ? translateApiError(query.error, t) : null,
  }
}
