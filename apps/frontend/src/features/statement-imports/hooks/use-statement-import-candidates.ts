"use client"

import { useQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { apiRequest } from "@/infrastructure/api/client"
import { queryKeys } from "@/infrastructure/query/query-keys"
import { translateApiError } from "@/shared/lib/api-error"
import type { StatementImportCandidate } from "../types"

const EMPTY_CANDIDATES: StatementImportCandidate[] = []

export function useStatementImportCandidates(
  householdId: string,
  jobId: string | null,
  enabled: boolean,
) {
  const { t } = useTranslation("common")
  const query = useQuery({
    queryKey: queryKeys.statementImports.candidates(householdId, jobId ?? ""),
    queryFn: () =>
      apiRequest<StatementImportCandidate[]>(
        `/households/${householdId}/statement-imports/${jobId}/candidates`,
      ),
    enabled: !!householdId && !!jobId && enabled,
  })

  return {
    candidates: query.data ?? EMPTY_CANDIDATES,
    loading: query.isLoading,
    error: query.error instanceof Error ? translateApiError(query.error, t) : null,
  }
}
