import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import * as goalsApi from '@/api/goals'
import type { TablesInsert, TablesUpdate } from '@/types/database.types'
import { queryKeys } from './keys'

export function useGoals() {
  const { householdId } = useAuth()
  return useQuery({
    queryKey: queryKeys.goals.all(householdId ?? ''),
    queryFn: () => goalsApi.getGoals(householdId!),
    enabled: !!householdId,
  })
}

export function useGoalContributions(goalId: string) {
  return useQuery({
    queryKey: queryKeys.goals.contributions(goalId),
    queryFn: () => goalsApi.getGoalContributions(goalId),
    enabled: !!goalId,
  })
}

export function useCreateGoal() {
  const qc = useQueryClient()
  const { householdId } = useAuth()
  return useMutation({
    mutationFn: (payload: Omit<TablesInsert<'goals'>, 'household_id'>) =>
      goalsApi.createGoal(householdId!, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.goals.all(householdId!) }),
  })
}

export function useUpdateGoal() {
  const qc = useQueryClient()
  const { householdId } = useAuth()
  return useMutation({
    mutationFn: ({ id, ...payload }: TablesUpdate<'goals'> & { id: string }) =>
      goalsApi.updateGoal(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.goals.all(householdId!) }),
  })
}

export function useDeleteGoal() {
  const qc = useQueryClient()
  const { householdId } = useAuth()
  return useMutation({
    mutationFn: goalsApi.deleteGoal,
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.goals.all(householdId!) }),
  })
}

export function useAddContribution() {
  const qc = useQueryClient()
  const { householdId, user } = useAuth()
  return useMutation({
    mutationFn: (
      payload: Omit<TablesInsert<'goal_contributions'>, 'household_id' | 'created_by'>
    ) => goalsApi.addGoalContribution(householdId!, user!.id, payload),
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: queryKeys.goals.all(householdId!) })
      qc.invalidateQueries({ queryKey: queryKeys.goals.contributions(v.goal_id!) })
    },
  })
}
