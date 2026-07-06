"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { apiRequest } from "@/infrastructure/api/client"
import { queryKeys } from "@/infrastructure/query/query-keys"
import type { Goal, GoalContribution } from "../types"
import type { ContributionFormValues, GoalFormValues } from "../schemas/goal.schemas"

/** Payload da API — `targetDate: null` limpa a data alvo. */
type GoalPayload = Omit<GoalFormValues, "targetDate"> & { targetDate: string | null }

function toPayload(values: GoalFormValues): GoalPayload {
  return { ...values, targetDate: values.targetDate ? values.targetDate : null }
}

export function useGoalMutations(householdId: string) {
  const queryClient = useQueryClient()

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.goals.all(householdId) })
    void queryClient.invalidateQueries({
      queryKey: queryKeys.households.overview(householdId),
    })
  }

  const createGoalMutation = useMutation({
    mutationFn: (values: GoalFormValues) =>
      apiRequest<Goal>(`/households/${householdId}/goals`, {
        method: "POST",
        body: JSON.stringify(toPayload(values)),
      }),
    onSuccess: invalidate,
  })

  const updateGoalMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: GoalFormValues }) =>
      apiRequest<Goal>(`/households/${householdId}/goals/${id}`, {
        method: "PATCH",
        body: JSON.stringify(toPayload(values)),
      }),
    onSuccess: invalidate,
  })

  const deleteGoalMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest<void>(`/households/${householdId}/goals/${id}`, { method: "DELETE" }),
    onSuccess: invalidate,
  })

  const addContributionMutation = useMutation({
    mutationFn: ({ goalId, values }: { goalId: string; values: ContributionFormValues }) =>
      apiRequest<GoalContribution>(
        `/households/${householdId}/goals/${goalId}/contributions`,
        { method: "POST", body: JSON.stringify(values) },
      ),
    onSuccess: invalidate,
  })

  const deleteContributionMutation = useMutation({
    mutationFn: ({ goalId, contributionId }: { goalId: string; contributionId: string }) =>
      apiRequest<void>(
        `/households/${householdId}/goals/${goalId}/contributions/${contributionId}`,
        { method: "DELETE" },
      ),
    onSuccess: invalidate,
  })

  return {
    createGoal: createGoalMutation.mutateAsync,
    updateGoal: (id: string, values: GoalFormValues) =>
      updateGoalMutation.mutateAsync({ id, values }),
    deleteGoal: deleteGoalMutation.mutateAsync,
    addContribution: (goalId: string, values: ContributionFormValues) =>
      addContributionMutation.mutateAsync({ goalId, values }),
    deleteContribution: (goalId: string, contributionId: string) =>
      deleteContributionMutation.mutateAsync({ goalId, contributionId }),
    isSaving: createGoalMutation.isPending || updateGoalMutation.isPending,
    isContributing: addContributionMutation.isPending,
  }
}
