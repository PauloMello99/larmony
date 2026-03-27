import { apiGet, apiPost, apiPut, apiDelete } from '@/services/apiClient'
import type { Tables, TablesInsert, TablesUpdate } from '@/types/database.types'

export type Transaction = Tables<'transactions'> & {
  categories: { name: string; color: string } | null
}

export interface TransactionFilters {
  month: number // 1-12
  year: number
  type?: 'income' | 'expense' | 'all'
  categoryId?: string
  search?: string
}

export interface TransactionSummary {
  income: number
  expense: number
  balance: number
}

export function getTransactions(householdId: string, filters: TransactionFilters) {
  const params: Record<string, string> = {
    householdId,
    month: String(filters.month),
    year: String(filters.year),
  }
  if (filters.type) params.type = filters.type
  if (filters.categoryId) params.categoryId = filters.categoryId
  if (filters.search) params.search = filters.search
  return apiGet<Transaction[]>('/api/transactions', params)
}

export function getTransactionSummary(householdId: string, month: number, year: number) {
  return apiGet<TransactionSummary>('/api/transactions/summary', {
    householdId,
    month: String(month),
    year: String(year),
  })
}

export function createTransaction(
  householdId: string,
  userId: string,
  payload: Omit<TablesInsert<'transactions'>, 'household_id' | 'created_by'>
) {
  return apiPost<Transaction>('/api/transactions', { householdId, userId, ...payload })
}

export function updateTransaction(id: string, payload: TablesUpdate<'transactions'>) {
  return apiPut<Transaction>(`/api/transactions/${id}`, payload)
}

export function deleteTransaction(id: string) {
  return apiDelete(`/api/transactions/${id}`)
}
