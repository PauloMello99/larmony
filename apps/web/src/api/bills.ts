import { apiGet, apiPost, apiPut, apiDelete } from '@/services/apiClient'
import type { Tables, TablesInsert, TablesUpdate } from '@/types/database.types'

export type Bill = Tables<'bills'> & {
  categories: { name: string; color: string } | null
}

export function getBills(householdId: string) {
  return apiGet<Bill[]>('/api/bills', { householdId })
}

export function createBill(
  householdId: string,
  payload: Omit<TablesInsert<'bills'>, 'household_id'>
) {
  return apiPost<Bill>('/api/bills', { householdId, ...payload })
}

export function updateBill(id: string, payload: TablesUpdate<'bills'>) {
  return apiPut<Bill>(`/api/bills/${id}`, payload)
}

export function deleteBill(id: string) {
  return apiDelete(`/api/bills/${id}`)
}
