"use client"

import { useQuery } from "@tanstack/react-query"
import { apiRequest } from "@/infrastructure/api/client"
import { queryKeys } from "@/infrastructure/query/query-keys"
import type { Bill } from "../types"

export function useBills(householdId: string) {
  const query = useQuery({
    queryKey: queryKeys.bills.list(householdId),
    queryFn: () => apiRequest<Bill[]>(`/households/${householdId}/bills`),
    enabled: !!householdId,
  })

  return {
    bills: query.data ?? [],
    loading: query.isLoading,
    error: query.error instanceof Error ? query.error.message : null,
  }
}
