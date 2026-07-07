"use client"

import { useQuery } from "@tanstack/react-query"
import { apiRequest } from "@/infrastructure/api/client"
import { queryKeys } from "@/infrastructure/query/query-keys"
import type { MonthlyReport } from "../types"

export function useMonthlyReport(householdId: string) {
  const query = useQuery({
    queryKey: queryKeys.reports.monthly(householdId),
    queryFn: () =>
      apiRequest<MonthlyReport>(`/households/${householdId}/reports/monthly`),
    enabled: !!householdId,
  })

  return {
    report: query.data ?? null,
    loading: query.isLoading,
    error: query.error instanceof Error ? query.error.message : null,
  }
}
