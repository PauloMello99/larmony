import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import * as transactionsApi from '@/api/transactions'
import type { TablesInsert, TablesUpdate } from '@/types/database.types'
import { queryKeys } from './keys'

export type { TransactionFilters } from '@/api/transactions'

export function useTransactions(filters: transactionsApi.TransactionFilters) {
  const { householdId } = useAuth()
  return useQuery({
    queryKey: queryKeys.transactions.list(householdId ?? '', filters),
    queryFn: () => transactionsApi.getTransactions(householdId!, filters),
    enabled: !!householdId,
  })
}

export function useTransactionSummary(month: number, year: number) {
  const { householdId } = useAuth()
  return useQuery({
    queryKey: queryKeys.transactions.summary(householdId ?? '', month, year),
    queryFn: () => transactionsApi.getTransactionSummary(householdId!, month, year),
    enabled: !!householdId,
  })
}

export function useCreateTransaction() {
  const qc = useQueryClient()
  const { householdId, user } = useAuth()
  return useMutation({
    mutationFn: (payload: Omit<TablesInsert<'transactions'>, 'household_id' | 'created_by'>) =>
      transactionsApi.createTransaction(householdId!, user!.id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.transactions.all(householdId!) })
      qc.invalidateQueries({ queryKey: queryKeys.transactions.summaryAll(householdId!) })
    },
  })
}

export function useUpdateTransaction() {
  const qc = useQueryClient()
  const { householdId } = useAuth()
  return useMutation({
    mutationFn: ({ id, ...payload }: TablesUpdate<'transactions'> & { id: string }) =>
      transactionsApi.updateTransaction(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.transactions.all(householdId!) })
      qc.invalidateQueries({ queryKey: queryKeys.transactions.summaryAll(householdId!) })
    },
  })
}

export function useDeleteTransaction() {
  const qc = useQueryClient()
  const { householdId } = useAuth()
  return useMutation({
    mutationFn: transactionsApi.deleteTransaction,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.transactions.all(householdId!) })
      qc.invalidateQueries({ queryKey: queryKeys.transactions.summaryAll(householdId!) })
    },
  })
}
