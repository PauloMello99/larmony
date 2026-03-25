import { supabase } from '@/services/supabase'
import type { TablesInsert, TablesUpdate } from '@/types/database.types'

export async function getBills(householdId: string) {
  const { data, error } = await supabase
    .from('bills')
    .select('*, categories(name, color)')
    .eq('household_id', householdId)
    .order('due_day')
  if (error) throw error
  return data ?? []
}

export async function createBill(
  householdId: string,
  payload: Omit<TablesInsert<'bills'>, 'household_id'>
) {
  const { data, error } = await supabase
    .from('bills')
    .insert({ ...payload, household_id: householdId })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateBill(id: string, payload: TablesUpdate<'bills'>) {
  const { data, error } = await supabase
    .from('bills')
    .update(payload)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteBill(id: string) {
  const { error } = await supabase.from('bills').delete().eq('id', id)
  if (error) throw error
}
