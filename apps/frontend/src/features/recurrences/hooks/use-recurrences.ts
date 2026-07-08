"use client"

import { useQuery } from "@tanstack/react-query"
import { apiRequest } from "@/infrastructure/api/client"
import { queryKeys } from "@/infrastructure/query/query-keys"
import type { Recurrence } from "../types"

export function useRecurrences(householdId: string) {
  const query = useQuery({
    queryKey: queryKeys.recurrences.list(householdId),
    queryFn: () => apiRequest<Recurrence[]>(`/households/${householdId}/recurrences`),
    enabled: !!householdId,
  })

  return {
    recurrences: query.data ?? [],
    loading: query.isLoading,
    error: query.error instanceof Error ? query.error.message : null,
  }
}
