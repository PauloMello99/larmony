import { supabase } from '@/services/supabase'
import { format } from 'date-fns'
import type { TablesInsert, TablesUpdate } from '@/types/database.types'

export async function getBudgets(householdId: string, month: number, year: number) {
  const { data, error } = await supabase
    .from('budgets')
    .select('*, categories(name, color)')
    .eq('household_id', householdId)
    .eq('month', month)
    .eq('year', year)
  if (error) throw error
  return data ?? []
}

export async function getBudgetSpending(householdId: string, month: number, year: number) {
  const from = format(new Date(year, month - 1, 1), 'yyyy-MM-dd')
  const to = format(new Date(year, month, 0), 'yyyy-MM-dd')
  const { data, error } = await supabase
    .from('transactions')
    .select('category_id, amount')
    .eq('household_id', householdId)
    .eq('type', 'expense')
    .gte('date', from)
    .lte('date', to)
    .not('category_id', 'is', null)
  if (error) throw error
  const spending: Record<string, number> = {}
  for (const t of data ?? []) {
    if (t.category_id) spending[t.category_id] = (spending[t.category_id] ?? 0) + t.amount
  }
  return spending
}

export async function createBudget(
  householdId: string,
  payload: Omit<TablesInsert<'budgets'>, 'household_id'>
) {
  const { data, error } = await supabase
    .from('budgets')
    .insert({ ...payload, household_id: householdId })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateBudget(id: string, payload: TablesUpdate<'budgets'>) {
  const { data, error } = await supabase
    .from('budgets')
    .update(payload)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteBudget(id: string) {
  const { error } = await supabase.from('budgets').delete().eq('id', id)
  if (error) throw error
}
