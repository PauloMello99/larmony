import { apiGet, apiPost, apiPut, apiDelete } from '@/services/apiClient'
import type { Tables, TablesInsert, TablesUpdate } from '@/types/database.types'

export type Budget = Tables<'budgets'> & {
  categories: { name: string; color: string } | null
}

export function getBudgets(householdId: string, month: number, year: number) {
  return apiGet<Budget[]>('/api/budgets', {
    householdId,
    month: String(month),
    year: String(year),
  })
}

export function getBudgetSpending(householdId: string, month: number, year: number) {
  return apiGet<Record<string, number>>('/api/budgets/spending', {
    householdId,
    month: String(month),
    year: String(year),
  })
}

export function createBudget(
  householdId: string,
  payload: Omit<TablesInsert<'budgets'>, 'household_id'>
) {
  return apiPost<Budget>('/api/budgets', { householdId, ...payload })
}

export function updateBudget(id: string, payload: TablesUpdate<'budgets'>) {
  return apiPut<Budget>(`/api/budgets/${id}`, payload)
}

export function deleteBudget(id: string) {
  return apiDelete(`/api/budgets/${id}`)
}
