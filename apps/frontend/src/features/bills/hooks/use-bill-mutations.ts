"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { apiRequest } from "@/infrastructure/api/client"
import { queryKeys } from "@/infrastructure/query/query-keys"
import type { Bill } from "../types"
import type { BillFormValues } from "../schemas/bill.schemas"

interface Transaction {
  id: string
}

export function useBillMutations(householdId: string) {
  const queryClient = useQueryClient()

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.bills.all(householdId) })

  const createBillMutation = useMutation({
    mutationFn: (values: BillFormValues) =>
      apiRequest<Bill>(`/households/${householdId}/bills`, {
        method: "POST",
        body: JSON.stringify(values),
      }),
    onSuccess: invalidate,
  })

  const updateBillMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: Partial<BillFormValues> }) =>
      apiRequest<Bill>(`/households/${householdId}/bills/${id}`, {
        method: "PATCH",
        body: JSON.stringify(values),
      }),
    onSuccess: invalidate,
  })

  const deleteBillMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest<void>(`/households/${householdId}/bills/${id}`, { method: "DELETE" }),
    onSuccess: invalidate,
  })

  const launchBillMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest<Transaction>(`/households/${householdId}/bills/${id}/launch`, {
        method: "POST",
      }),
    onSuccess: () => {
      invalidate()
      void queryClient.invalidateQueries({ queryKey: queryKeys.transactions.all(householdId) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.households.overview(householdId) })
    },
  })

  return {
    createBill: createBillMutation.mutateAsync,
    updateBill: (id: string, values: Partial<BillFormValues>) =>
      updateBillMutation.mutateAsync({ id, values }),
    deleteBill: deleteBillMutation.mutateAsync,
    launchBill: launchBillMutation.mutateAsync,
    isCreating: createBillMutation.isPending,
    isUpdating: updateBillMutation.isPending,
    isDeleting: deleteBillMutation.isPending,
    isLaunching: launchBillMutation.isPending,
  }
}
