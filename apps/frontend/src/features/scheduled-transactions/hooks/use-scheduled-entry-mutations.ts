"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { apiRequest } from "@/infrastructure/api/client"
import { queryKeys } from "@/infrastructure/query/query-keys"
import type { ScheduledEntry } from "../types"
import type { ScheduledEntryFormValues } from "../schemas/scheduled-entry.schemas"

interface Transaction {
  id: string
}

export function useScheduledEntryMutations(householdId: string) {
  const queryClient = useQueryClient()

  const invalidate = () => {
    void queryClient.invalidateQueries({
      queryKey: queryKeys.scheduledTransactions.all(householdId),
    })
    // Entradas auto geram transações direto pelo engine; entradas manuais
    // geram ao lançar — em ambos os casos, transactions/overview mudam.
    void queryClient.invalidateQueries({ queryKey: queryKeys.transactions.all(householdId) })
    void queryClient.invalidateQueries({ queryKey: queryKeys.households.overview(householdId) })
  }

  const createMutation = useMutation({
    mutationFn: (values: ScheduledEntryFormValues) =>
      apiRequest<ScheduledEntry>(`/households/${householdId}/scheduled-transactions`, {
        method: "POST",
        body: JSON.stringify(values),
      }),
    onSuccess: invalidate,
  })

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      values,
    }: {
      id: string
      values: Partial<ScheduledEntryFormValues>
    }) =>
      apiRequest<ScheduledEntry>(`/households/${householdId}/scheduled-transactions/${id}`, {
        method: "PATCH",
        body: JSON.stringify(values),
      }),
    onSuccess: invalidate,
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest<void>(`/households/${householdId}/scheduled-transactions/${id}`, {
        method: "DELETE",
      }),
    onSuccess: invalidate,
  })

  const launchMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest<Transaction>(`/households/${householdId}/scheduled-transactions/${id}/launch`, {
        method: "POST",
      }),
    onSuccess: invalidate,
  })

  return {
    createEntry: createMutation.mutateAsync,
    updateEntry: (id: string, values: Partial<ScheduledEntryFormValues>) =>
      updateMutation.mutateAsync({ id, values }),
    deleteEntry: deleteMutation.mutateAsync,
    launchEntry: launchMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isLaunching: launchMutation.isPending,
  }
}
