"use client"

import { useQuery } from "@tanstack/react-query"
import { apiRequest } from "@/infrastructure/api/client"
import { queryKeys } from "@/infrastructure/query/query-keys"
import type { ScheduledEntry } from "../types"

export function useScheduledEntries(householdId: string) {
  const query = useQuery({
    queryKey: queryKeys.scheduledTransactions.list(householdId),
    queryFn: () =>
      apiRequest<ScheduledEntry[]>(`/households/${householdId}/scheduled-transactions`),
    enabled: !!householdId,
  })

  return {
    entries: query.data ?? [],
    loading: query.isLoading,
    error: query.error instanceof Error ? query.error.message : null,
  }
}
