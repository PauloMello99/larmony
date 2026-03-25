import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import * as budgetsApi from '@/api/budgets'
import type { TablesInsert, TablesUpdate } from '@/types/database.types'
import { queryKeys } from './keys'

export function useBudgets(month: number, year: number) {
  const { householdId } = useAuth()
  return useQuery({
    queryKey: queryKeys.budgets.list(householdId ?? '', month, year),
    queryFn: () => budgetsApi.getBudgets(householdId!, month, year),
    enabled: !!householdId,
  })
}

export function useBudgetSpending(month: number, year: number) {
  const { householdId } = useAuth()
  return useQuery({
    queryKey: queryKeys.budgets.spending(householdId ?? '', month, year),
    queryFn: () => budgetsApi.getBudgetSpending(householdId!, month, year),
    enabled: !!householdId,
  })
}

export function useCreateBudget() {
  const qc = useQueryClient()
  const { householdId } = useAuth()
  return useMutation({
    mutationFn: (payload: Omit<TablesInsert<'budgets'>, 'household_id'>) =>
      budgetsApi.createBudget(householdId!, payload),
    onSuccess: (_d, v) =>
      qc.invalidateQueries({ queryKey: queryKeys.budgets.list(householdId!, v.month!, v.year!) }),
  })
}

export function useUpdateBudget() {
  const qc = useQueryClient()
  const { householdId } = useAuth()
  return useMutation({
    mutationFn: ({ id, ...payload }: TablesUpdate<'budgets'> & { id: string }) =>
      budgetsApi.updateBudget(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.budgets.all(householdId!) }),
  })
}

export function useDeleteBudget() {
  const qc = useQueryClient()
  const { householdId } = useAuth()
  return useMutation({
    mutationFn: budgetsApi.deleteBudget,
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.budgets.all(householdId!) }),
  })
}
