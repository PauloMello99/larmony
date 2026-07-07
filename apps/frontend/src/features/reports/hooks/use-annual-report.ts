"use client"

import { useQuery } from "@tanstack/react-query"
import { apiRequest } from "@/infrastructure/api/client"
import { queryKeys } from "@/infrastructure/query/query-keys"
import type { AnnualReport } from "../types"

export function useAnnualReport(householdId: string, year: number) {
  const query = useQuery({
    queryKey: queryKeys.reports.annual(householdId, year),
    queryFn: () =>
      apiRequest<AnnualReport>(`/households/${householdId}/reports/annual?year=${year}`),
    enabled: !!householdId,
  })

  return {
    report: query.data ?? null,
    loading: query.isLoading,
    error: query.error instanceof Error ? query.error.message : null,
  }
}
