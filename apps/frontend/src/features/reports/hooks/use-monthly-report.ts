"use client"

import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { apiRequest } from "@/infrastructure/api/client"
import { queryKeys } from "@/infrastructure/query/query-keys"
import { translateApiError } from "@/shared/lib/api-error"
import type { MonthlyReport } from "../types"

export function useMonthlyReport(householdId: string, year: number, month: number) {
  const { t } = useTranslation("common")
  const query = useQuery({
    queryKey: queryKeys.reports.monthly(householdId, year, month),
    queryFn: () =>
      apiRequest<MonthlyReport>(
        `/households/${householdId}/reports/monthly?year=${year}&month=${month}`,
      ),
    enabled: !!householdId,
    // Mantém o relatório anterior visível ao navegar entre meses — a navegação
    // não pisca para skeleton a cada troca (só no 1º carregamento).
    placeholderData: keepPreviousData,
  })

  return {
    report: query.data ?? null,
    loading: query.isLoading,
    error: query.error instanceof Error ? translateApiError(query.error, t) : null,
  }
}
