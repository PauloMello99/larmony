import { supabase } from '@/services/supabase'
import type { Tables, TablesInsert, TablesUpdate } from '@/types/database.types'

export type Category = Tables<'categories'>

export async function getCategories(householdId: string) {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('household_id', householdId)
    .order('name')
  if (error) throw error
  return data ?? []
}

export async function createCategory(
  householdId: string,
  payload: Omit<TablesInsert<'categories'>, 'household_id'>
) {
  const { data, error } = await supabase
    .from('categories')
    .insert({ ...payload, household_id: householdId })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateCategory(id: string, payload: TablesUpdate<'categories'>) {
  const { data, error } = await supabase
    .from('categories')
    .update(payload)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteCategory(id: string) {
  const { error } = await supabase.from('categories').delete().eq('id', id)
  if (error) throw error
}
