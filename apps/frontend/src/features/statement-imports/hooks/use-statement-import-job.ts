"use client"

import { useQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { apiRequest } from "@/infrastructure/api/client"
import { queryKeys } from "@/infrastructure/query/query-keys"
import { translateApiError } from "@/shared/lib/api-error"
import type { StatementImportJob, StatementImportStatus } from "../types"

const ACTIVE_STATUSES: readonly StatementImportStatus[] = ["pending", "processing"]

export function useStatementImportJob(householdId: string, jobId: string | null) {
  const { t } = useTranslation("common")
  const query = useQuery({
    queryKey: queryKeys.statementImports.job(householdId, jobId ?? ""),
    queryFn: () =>
      apiRequest<StatementImportJob>(`/households/${householdId}/statement-imports/${jobId}`),
    enabled: !!householdId && !!jobId,
    refetchInterval: (q) => {
      const status = q.state.data?.status
      return status && ACTIVE_STATUSES.includes(status) ? 2000 : false
    },
  })

  return {
    job: query.data ?? null,
    loading: query.isLoading,
    error: query.error instanceof Error ? translateApiError(query.error, t) : null,
  }
}
