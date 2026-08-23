"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { apiRequest } from "@/infrastructure/api/client"
import { queryKeys } from "@/infrastructure/query/query-keys"
import type { StatementImportCandidate, StatementImportJob, StatementImportSource } from "../types"

export function useStatementImportMutations(householdId: string) {
  const queryClient = useQueryClient()

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.statementImports.all(householdId) })
  }

  const createImportJobMutation = useMutation({
    mutationFn: (input: { source: StatementImportSource; fileBase64: string }) =>
      apiRequest<StatementImportJob>(`/households/${householdId}/statement-imports`, {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: invalidate,
  })

  const confirmCandidateMutation = useMutation({
    mutationFn: ({
      jobId,
      candidateId,
      categoryId,
    }: {
      jobId: string
      candidateId: string
      categoryId?: string
    }) =>
      apiRequest<StatementImportCandidate>(
        `/households/${householdId}/statement-imports/${jobId}/candidates/${candidateId}/confirm`,
        {
          method: "POST",
          body: JSON.stringify(categoryId !== undefined ? { categoryId } : {}),
        },
      ),
    onSuccess: () => {
      invalidate()
      // Confirmar cria uma transação real — atualiza os KPIs do overview
      // (mesmo padrão de use-transaction-mutations.ts).
      void queryClient.invalidateQueries({ queryKey: queryKeys.households.overview(householdId) })
    },
  })

  const dismissCandidateMutation = useMutation({
    mutationFn: ({ jobId, candidateId }: { jobId: string; candidateId: string }) =>
      apiRequest<void>(
        `/households/${householdId}/statement-imports/${jobId}/candidates/${candidateId}/dismiss`,
        { method: "POST" },
      ),
    onSuccess: invalidate,
  })

  return {
    createImportJob: createImportJobMutation.mutateAsync,
    confirmCandidate: confirmCandidateMutation.mutateAsync,
    dismissCandidate: dismissCandidateMutation.mutateAsync,
    isCreating: createImportJobMutation.isPending,
  }
}
