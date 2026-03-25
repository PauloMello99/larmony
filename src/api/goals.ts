import { supabase } from '@/services/supabase'
import type { TablesInsert, TablesUpdate } from '@/types/database.types'

export async function getGoals(householdId: string) {
  const { data, error } = await supabase
    .from('goals')
    .select('*')
    .eq('household_id', householdId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function getGoalContributions(goalId: string) {
  const { data, error } = await supabase
    .from('goal_contributions')
    .select('*')
    .eq('goal_id', goalId)
    .order('date', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function createGoal(
  householdId: string,
  payload: Omit<TablesInsert<'goals'>, 'household_id'>
) {
  const { data, error } = await supabase
    .from('goals')
    .insert({ ...payload, household_id: householdId })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateGoal(id: string, payload: TablesUpdate<'goals'>) {
  const { data, error } = await supabase
    .from('goals')
    .update(payload)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteGoal(id: string) {
  const { error } = await supabase.from('goals').delete().eq('id', id)
  if (error) throw error
}

export async function addGoalContribution(
  householdId: string,
  userId: string,
  payload: Omit<TablesInsert<'goal_contributions'>, 'household_id' | 'created_by'>
) {
  const { data, error } = await supabase
    .from('goal_contributions')
    .insert({ ...payload, household_id: householdId, created_by: userId })
    .select()
    .single()
  if (error) throw error
  return data
}
