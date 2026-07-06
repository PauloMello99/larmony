"use client"

import { useQuery } from "@tanstack/react-query"
import { apiRequest } from "@/infrastructure/api/client"
import { queryKeys } from "@/infrastructure/query/query-keys"
import type { Goal } from "../types"

export function useGoals(householdId: string) {
  const query = useQuery({
    queryKey: queryKeys.goals.list(householdId),
    queryFn: () => apiRequest<Goal[]>(`/households/${householdId}/goals`),
    enabled: !!householdId,
  })

  return {
    goals: query.data ?? [],
    loading: query.isLoading,
    error: query.error instanceof Error ? query.error.message : null,
  }
}
