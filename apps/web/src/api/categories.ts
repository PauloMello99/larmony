import { apiGet, apiPost, apiPut, apiDelete } from '@/services/apiClient'
import type { Tables, TablesInsert, TablesUpdate } from '@/types/database.types'

export type Category = Tables<'categories'>

export function getCategories(householdId: string) {
  return apiGet<Category[]>('/api/categories', { householdId })
}

export function createCategory(
  householdId: string,
  payload: Omit<TablesInsert<'categories'>, 'household_id'>
) {
  return apiPost<Category>('/api/categories', { householdId, ...payload })
}

export function updateCategory(id: string, payload: TablesUpdate<'categories'>) {
  return apiPut<Category>(`/api/categories/${id}`, payload)
}

export function deleteCategory(id: string) {
  return apiDelete(`/api/categories/${id}`)
}
