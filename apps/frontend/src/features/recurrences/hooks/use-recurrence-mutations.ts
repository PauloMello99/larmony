"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { apiRequest } from "@/infrastructure/api/client"
import { queryKeys } from "@/infrastructure/query/query-keys"
import type { Recurrence } from "../types"
import type { RecurrenceFormValues } from "../schemas/recurrence.schemas"

export function useRecurrenceMutations(householdId: string) {
  const queryClient = useQueryClient()

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.recurrences.all(householdId) })
    // As transações geradas pelo engine aparecem em transactions/overview.
    void queryClient.invalidateQueries({ queryKey: queryKeys.transactions.all(householdId) })
    void queryClient.invalidateQueries({ queryKey: queryKeys.households.overview(householdId) })
  }

  const createMutation = useMutation({
    mutationFn: (values: RecurrenceFormValues) =>
      apiRequest<Recurrence>(`/households/${householdId}/recurrences`, {
        method: "POST",
        body: JSON.stringify(values),
      }),
    onSuccess: invalidate,
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: Partial<RecurrenceFormValues> }) =>
      apiRequest<Recurrence>(`/households/${householdId}/recurrences/${id}`, {
        method: "PATCH",
        body: JSON.stringify(values),
      }),
    onSuccess: invalidate,
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest<void>(`/households/${householdId}/recurrences/${id}`, { method: "DELETE" }),
    onSuccess: invalidate,
  })

  return {
    createRecurrence: createMutation.mutateAsync,
    updateRecurrence: (id: string, values: Partial<RecurrenceFormValues>) =>
      updateMutation.mutateAsync({ id, values }),
    deleteRecurrence: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  }
}
