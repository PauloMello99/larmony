"use client"

import { useQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { apiRequest } from "@/infrastructure/api/client"
import { queryKeys } from "@/infrastructure/query/query-keys"
import { translateApiError } from "@/shared/lib/api-error"
import type { ScheduledEntry } from "../types"

export function useScheduledEntries(householdId: string) {
  const { t } = useTranslation("common")
  const query = useQuery({
    queryKey: queryKeys.scheduledTransactions.list(householdId),
    queryFn: () =>
      apiRequest<ScheduledEntry[]>(`/households/${householdId}/scheduled-transactions`),
    enabled: !!householdId,
  })

  return {
    entries: query.data ?? [],
    loading: query.isLoading,
    error: query.error instanceof Error ? translateApiError(query.error, t) : null,
  }
}
