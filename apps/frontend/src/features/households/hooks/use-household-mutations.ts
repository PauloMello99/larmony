"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { apiRequest } from "@/infrastructure/api/client"
import { queryKeys } from "@/infrastructure/query/query-keys"
import type { HouseholdSummary } from "@/features/dashboard/hooks/use-households"
import type { CreateHouseholdFormValues, UpdateHouseholdFormValues } from "../schemas/household.schemas"

export function useHouseholdMutations(householdId?: string) {
  const queryClient = useQueryClient()

  const createHouseholdMutation = useMutation({
    mutationFn: (values: CreateHouseholdFormValues) =>
      apiRequest<HouseholdSummary>("/households", {
        method: "POST",
        body: JSON.stringify(values),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.households.list() })
    },
  })

  const updateHouseholdMutation = useMutation({
    mutationFn: (values: UpdateHouseholdFormValues) => {
      if (!householdId) throw new Error("householdId is required for update")
      return apiRequest<HouseholdSummary>(`/households/${householdId}`, {
        method: "PATCH",
        body: JSON.stringify(values),
      })
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.households.list() })
      if (householdId) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.households.detail(householdId) })
      }
    },
  })

  const deleteHouseholdMutation = useMutation({
    mutationFn: () => {
      if (!householdId) throw new Error("householdId is required for delete")
      return apiRequest<void>(`/households/${householdId}`, { method: "DELETE" })
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.households.all })
    },
  })

  const transferOwnershipMutation = useMutation({
    mutationFn: (memberId: string) => {
      if (!householdId) throw new Error("householdId is required for transfer")
      return apiRequest<void>(`/households/${householdId}/transfer-ownership`, {
        method: "POST",
        body: JSON.stringify({ memberId }),
      })
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.households.all })
      if (householdId) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.members.list(householdId) })
      }
    },
  })

  return {
    createHousehold: createHouseholdMutation.mutateAsync,
    updateHousehold: updateHouseholdMutation.mutateAsync,
    deleteHousehold: deleteHouseholdMutation.mutateAsync,
    transferOwnership: transferOwnershipMutation.mutateAsync,
    isCreating: createHouseholdMutation.isPending,
    isUpdating: updateHouseholdMutation.isPending,
    isDeleting: deleteHouseholdMutation.isPending,
    isTransferring: transferOwnershipMutation.isPending,
  }
}
