import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import * as billsApi from '@/api/bills'
import type { TablesInsert, TablesUpdate } from '@/types/database.types'
import { queryKeys } from './keys'

export function useBills() {
  const { householdId } = useAuth()
  return useQuery({
    queryKey: queryKeys.bills.all(householdId ?? ''),
    queryFn: () => billsApi.getBills(householdId!),
    enabled: !!householdId,
  })
}

export function useCreateBill() {
  const qc = useQueryClient()
  const { householdId } = useAuth()
  return useMutation({
    mutationFn: (payload: Omit<TablesInsert<'bills'>, 'household_id'>) =>
      billsApi.createBill(householdId!, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.bills.all(householdId!) }),
  })
}

export function useUpdateBill() {
  const qc = useQueryClient()
  const { householdId } = useAuth()
  return useMutation({
    mutationFn: ({ id, ...payload }: TablesUpdate<'bills'> & { id: string }) =>
      billsApi.updateBill(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.bills.all(householdId!) }),
  })
}

export function useDeleteBill() {
  const qc = useQueryClient()
  const { householdId } = useAuth()
  return useMutation({
    mutationFn: billsApi.deleteBill,
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.bills.all(householdId!) }),
  })
}
