"use client"

import { useQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { apiRequest, ApiError } from "@/infrastructure/api/client"
import { queryKeys } from "@/infrastructure/query/query-keys"
import { translateApiError } from "@/shared/lib/api-error"
import type { AnnualReport } from "../types"

export function useAnnualReport(householdId: string, year: number, enabled = true) {
  const { t } = useTranslation("common")
  const query = useQuery({
    queryKey: queryKeys.reports.annual(householdId, year),
    queryFn: () =>
      apiRequest<AnnualReport>(`/households/${householdId}/reports/annual?year=${year}`),
    // `enabled` permite não disparar a request quando o lar não tem a
    // capability (paywall proativo, B-6) — evita o 402 previsível.
    enabled: !!householdId && enabled,
    // Erro de negócio (4xx, ex.: 402 premium-only) não deve retentar.
    retry: (failureCount, error) =>
      !(error instanceof ApiError && error.status < 500) && failureCount < 1,
  })

  // 402 PREMIUM_REQUIRED (B-4): relatório anual é premium-only. A page mostra o
  // paywall proativamente, mas tratamos o 402 defensivamente aqui também.
  const premiumRequired =
    query.error instanceof ApiError && query.error.code === "PREMIUM_REQUIRED"

  return {
    report: query.data ?? null,
    loading: query.isLoading,
    premiumRequired,
    error: premiumRequired
      ? null
      : query.error instanceof Error
        ? translateApiError(query.error, t)
        : null,
  }
}
