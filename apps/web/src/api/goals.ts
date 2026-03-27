import { apiGet, apiPost, apiPut, apiDelete } from '@/services/apiClient'
import type { Tables, TablesInsert, TablesUpdate } from '@/types/database.types'

export type Goal = Tables<'goals'>
export type GoalContribution = Tables<'goal_contributions'>

export function getGoals(householdId: string) {
  return apiGet<Goal[]>('/api/goals', { householdId })
}

export function getGoalContributions(goalId: string) {
  return apiGet<GoalContribution[]>(`/api/goals/${goalId}/contributions`)
}

export function createGoal(
  householdId: string,
  payload: Omit<TablesInsert<'goals'>, 'household_id'>
) {
  return apiPost<Goal>('/api/goals', { householdId, ...payload })
}

export function updateGoal(id: string, payload: TablesUpdate<'goals'>) {
  return apiPut<Goal>(`/api/goals/${id}`, payload)
}

export function deleteGoal(id: string) {
  return apiDelete(`/api/goals/${id}`)
}

export function addGoalContribution(
  householdId: string,
  userId: string,
  goalId: string,
  payload: Omit<TablesInsert<'goal_contributions'>, 'household_id' | 'created_by' | 'goal_id'>
) {
  return apiPost<GoalContribution>(`/api/goals/${goalId}/contributions`, {
    householdId,
    userId,
    ...payload,
  })
}
