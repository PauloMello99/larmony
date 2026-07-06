"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { apiRequest } from "@/infrastructure/api/client"
import { queryKeys } from "@/infrastructure/query/query-keys"
import type { Transaction } from "../types"
import type { TransactionFormValues } from "../schemas/transaction.schemas"

export function useTransactionMutations(householdId: string) {
  const queryClient = useQueryClient()

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.transactions.all(householdId) })

  const createTransactionMutation = useMutation({
    mutationFn: (values: TransactionFormValues) =>
      apiRequest<Transaction>(`/households/${householdId}/transactions`, {
        method: "POST",
        body: JSON.stringify(values),
      }),
    onSuccess: invalidate,
  })

  const updateTransactionMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: Partial<TransactionFormValues> }) =>
      apiRequest<Transaction>(`/households/${householdId}/transactions/${id}`, {
        method: "PATCH",
        body: JSON.stringify(values),
      }),
    onSuccess: invalidate,
  })

  const deleteTransactionMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest<void>(`/households/${householdId}/transactions/${id}`, { method: "DELETE" }),
    onSuccess: invalidate,
  })

  return {
    createTransaction: createTransactionMutation.mutateAsync,
    updateTransaction: (id: string, values: Partial<TransactionFormValues>) =>
      updateTransactionMutation.mutateAsync({ id, values }),
    deleteTransaction: deleteTransactionMutation.mutateAsync,
    isCreating: createTransactionMutation.isPending,
    isUpdating: updateTransactionMutation.isPending,
    isDeleting: deleteTransactionMutation.isPending,
  }
}
