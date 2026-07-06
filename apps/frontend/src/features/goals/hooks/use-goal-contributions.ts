"use client"

import { useQuery } from "@tanstack/react-query"
import { apiRequest } from "@/infrastructure/api/client"
import { queryKeys } from "@/infrastructure/query/query-keys"
import type { GoalContribution } from "../types"

/** Histórico de aportes — buscado só com o dialog aberto (`enabled`). */
export function useGoalContributions(householdId: string, goalId: string | null) {
  const query = useQuery({
    queryKey: queryKeys.goals.contributions(householdId, goalId ?? ""),
    queryFn: () =>
      apiRequest<GoalContribution[]>(
        `/households/${householdId}/goals/${goalId}/contributions`,
      ),
    enabled: !!householdId && !!goalId,
  })

  return {
    contributions: query.data ?? [],
    loading: query.isLoading,
  }
}
