"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { apiRequest } from "@/infrastructure/api/client"
import { queryKeys } from "@/infrastructure/query/query-keys"
import type { Transaction } from "../types"
import type { TransactionFormValues } from "../schemas/transaction.schemas"

export function useTransactionMutations(householdId: string) {
  const queryClient = useQueryClient()

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.transactions.all(householdId) })
    void queryClient.invalidateQueries({ queryKey: queryKeys.households.overview(householdId) })
  }

  const createTransactionMutation = useMutation({
    // Parcela (installmentCount>1) retorna array; única retorna objeto.
    mutationFn: (values: TransactionFormValues) =>
      apiRequest<Transaction | Transaction[]>(`/households/${householdId}/transactions`, {
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

  const deleteSeriesMutation = useMutation({
    mutationFn: (groupId: string) =>
      apiRequest<void>(
        `/households/${householdId}/transactions/installment-groups/${groupId}`,
        { method: "DELETE" },
      ),
    onSuccess: invalidate,
  })

  return {
    createTransaction: createTransactionMutation.mutateAsync,
    updateTransaction: (id: string, values: Partial<TransactionFormValues>) =>
      updateTransactionMutation.mutateAsync({ id, values }),
    deleteTransaction: deleteTransactionMutation.mutateAsync,
    deleteSeries: deleteSeriesMutation.mutateAsync,
    isCreating: createTransactionMutation.isPending,
    isUpdating: updateTransactionMutation.isPending,
    isDeleting: deleteTransactionMutation.isPending,
  }
}
