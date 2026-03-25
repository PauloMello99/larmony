import { supabase } from '@/services/supabase'
import { format } from 'date-fns'
import type { TablesInsert, TablesUpdate } from '@/types/database.types'

export interface TransactionFilters {
  month: number // 1-12
  year: number
  type?: 'income' | 'expense' | 'all'
  categoryId?: string
  search?: string
}

export async function getTransactions(householdId: string, filters: TransactionFilters) {
  const from = format(new Date(filters.year, filters.month - 1, 1), 'yyyy-MM-dd')
  const to = format(new Date(filters.year, filters.month, 0), 'yyyy-MM-dd')

  let q = supabase
    .from('transactions')
    .select('*, categories(name, color)')
    .eq('household_id', householdId)
    .gte('date', from)
    .lte('date', to)
    .order('date', { ascending: false })

  if (filters.type && filters.type !== 'all') q = q.eq('type', filters.type)
  if (filters.categoryId) q = q.eq('category_id', filters.categoryId)
  if (filters.search) q = q.ilike('description', `%${filters.search}%`)

  const { data, error } = await q
  if (error) throw error
  return data ?? []
}

export async function getTransactionSummary(householdId: string, month: number, year: number) {
  const from = format(new Date(year, month - 1, 1), 'yyyy-MM-dd')
  const to = format(new Date(year, month, 0), 'yyyy-MM-dd')
  const { data, error } = await supabase
    .from('transactions')
    .select('type, amount')
    .eq('household_id', householdId)
    .gte('date', from)
    .lte('date', to)
  if (error) throw error
  const income = (data ?? []).filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const expense = (data ?? []).filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
  return { income, expense, balance: income - expense }
}

export async function createTransaction(
  householdId: string,
  userId: string,
  payload: Omit<TablesInsert<'transactions'>, 'household_id' | 'created_by'>
) {
  const { data, error } = await supabase
    .from('transactions')
    .insert({ ...payload, household_id: householdId, created_by: userId })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateTransaction(id: string, payload: TablesUpdate<'transactions'>) {
  const { data, error } = await supabase
    .from('transactions')
    .update(payload)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteTransaction(id: string) {
  const { error } = await supabase.from('transactions').delete().eq('id', id)
  if (error) throw error
}
