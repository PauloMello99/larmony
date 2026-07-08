"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { apiRequest } from "@/infrastructure/api/client"
import { queryKeys } from "@/infrastructure/query/query-keys"
import type { Budget } from "../types"

interface CreateBudgetInput {
  categoryId: string
  month: number
  year: number
  amountCents: number
}

export function useBudgetMutations(householdId: string) {
  const queryClient = useQueryClient()

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.budgets.all(householdId) })

  const createBudgetMutation = useMutation({
    mutationFn: (input: CreateBudgetInput) =>
      apiRequest<Budget>(`/households/${householdId}/budgets`, {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: invalidate,
  })

  const updateBudgetMutation = useMutation({
    mutationFn: ({ id, amountCents }: { id: string; amountCents: number }) =>
      apiRequest<Budget>(`/households/${householdId}/budgets/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ amountCents }),
      }),
    onSuccess: invalidate,
  })

  const deleteBudgetMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest<void>(`/households/${householdId}/budgets/${id}`, { method: "DELETE" }),
    onSuccess: invalidate,
  })

  return {
    createBudget: createBudgetMutation.mutateAsync,
    updateBudget: (id: string, amountCents: number) =>
      updateBudgetMutation.mutateAsync({ id, amountCents }),
    deleteBudget: deleteBudgetMutation.mutateAsync,
    isCreating: createBudgetMutation.isPending,
    isUpdating: updateBudgetMutation.isPending,
    isDeleting: deleteBudgetMutation.isPending,
  }
}
