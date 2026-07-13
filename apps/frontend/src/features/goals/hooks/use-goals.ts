"use client"

import { useQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { apiRequest } from "@/infrastructure/api/client"
import { queryKeys } from "@/infrastructure/query/query-keys"
import { translateApiError } from "@/shared/lib/api-error"
import type { Goal } from "../types"

export function useGoals(householdId: string) {
  const { t } = useTranslation("common")
  const query = useQuery({
    queryKey: queryKeys.goals.list(householdId),
    queryFn: () => apiRequest<Goal[]>(`/households/${householdId}/goals`),
    enabled: !!householdId,
  })

  return {
    goals: query.data ?? [],
    loading: query.isLoading,
    error: query.error instanceof Error ? translateApiError(query.error, t) : null,
  }
}
