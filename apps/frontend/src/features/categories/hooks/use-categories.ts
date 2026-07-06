"use client"

import { useQuery } from "@tanstack/react-query"
import { apiRequest } from "@/infrastructure/api/client"
import { queryKeys } from "@/infrastructure/query/query-keys"
import type { Category } from "../types"

export function useCategories(householdId: string) {
  const query = useQuery({
    queryKey: queryKeys.categories.list(householdId),
    queryFn: () => apiRequest<Category[]>(`/households/${householdId}/categories`),
    enabled: !!householdId,
  })

  return {
    categories: query.data ?? [],
    loading: query.isLoading,
    error: query.error instanceof Error ? query.error.message : null,
  }
}
