"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiRequest } from "@/infrastructure/api/client"
import { queryKeys } from "@/infrastructure/query/query-keys"
import type { Member, Invitation, InviteResult, HouseholdRole } from "../types"

export function useMembers(householdId: string) {
  const queryClient = useQueryClient()

  // ── Queries ────────────────────────────────────────────────────────────────

  const membersQuery = useQuery({
    queryKey: queryKeys.members.list(householdId),
    queryFn: () => apiRequest<Member[]>(`/households/${householdId}/members`),
    enabled: !!householdId,
  })

  const invitationsQuery = useQuery({
    queryKey: queryKeys.members.invitations(householdId),
    queryFn: () =>
      apiRequest<Invitation[]>(`/households/${householdId}/invitations`).catch(
        () => [] as Invitation[],
      ),
    enabled: !!householdId,
  })

  // ── Mutations ──────────────────────────────────────────────────────────────

  const inviteMemberMutation = useMutation({
    mutationFn: ({ email, role }: { email: string; role: HouseholdRole }) =>
      apiRequest<InviteResult>(`/households/${householdId}/members/invite`, {
        method: "POST",
        body: JSON.stringify({ email, role }),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.members.invitations(householdId) })
    },
  })

  const updateMemberRoleMutation = useMutation({
    mutationFn: ({ memberId, role }: { memberId: string; role: HouseholdRole }) =>
      apiRequest<Member>(`/households/${householdId}/members/${memberId}/role`, {
        method: "PATCH",
        body: JSON.stringify({ role }),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.members.list(householdId) })
    },
  })

  const updateMemberPermissionsMutation = useMutation({
    mutationFn: ({
      memberId,
      permissions,
    }: {
      memberId: string
      permissions: string[]
    }) =>
      apiRequest<Member>(`/households/${householdId}/members/${memberId}/permissions`, {
        method: "PATCH",
        body: JSON.stringify({ permissions }),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.members.list(householdId) })
      // permissões afetam o nav/escopo do próprio funcionário → invalida households também.
      void queryClient.invalidateQueries({ queryKey: queryKeys.households.all })
    },
  })

  const setMemberStatusMutation = useMutation({
    mutationFn: ({ memberId, enabled }: { memberId: string; enabled: boolean }) =>
      apiRequest<Member>(`/households/${householdId}/members/${memberId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ enabled }),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.members.list(householdId) })
    },
  })

  const removeMemberMutation = useMutation({
    mutationFn: (memberId: string) =>
      apiRequest<void>(`/households/${householdId}/members/${memberId}`, { method: "DELETE" }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.members.list(householdId) })
    },
  })

  const cancelInvitationMutation = useMutation({
    mutationFn: (invitationId: string) =>
      apiRequest<void>(`/households/${householdId}/invitations/${invitationId}`, { method: "DELETE" }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.members.invitations(householdId) })
    },
  })

  // ── Stable wrappers (unchanged call signature for consumers) ───────────────

  async function inviteMember(email: string, role: HouseholdRole): Promise<InviteResult> {
    return inviteMemberMutation.mutateAsync({ email, role })
  }

  async function updateMemberRole(memberId: string, role: HouseholdRole): Promise<Member> {
    return updateMemberRoleMutation.mutateAsync({ memberId, role })
  }

  async function removeMember(memberId: string): Promise<void> {
    return removeMemberMutation.mutateAsync(memberId)
  }

  async function setMemberStatus(
    memberId: string,
    enabled: boolean,
  ): Promise<Member> {
    return setMemberStatusMutation.mutateAsync({ memberId, enabled })
  }

  async function updateMemberPermissions(
    memberId: string,
    permissions: string[],
  ): Promise<Member> {
    return updateMemberPermissionsMutation.mutateAsync({ memberId, permissions })
  }

  async function cancelInvitation(invitationId: string): Promise<void> {
    return cancelInvitationMutation.mutateAsync(invitationId)
  }

  return {
    members: membersQuery.data ?? [],
    invitations: invitationsQuery.data ?? [],
    loading: membersQuery.isLoading,
    error: membersQuery.error instanceof Error ? membersQuery.error.message : null,
    refetch: () =>
      Promise.all([membersQuery.refetch(), invitationsQuery.refetch()]),
    inviteMember,
    updateMemberRole,
    removeMember,
    setMemberStatus,
    updateMemberPermissions,
    cancelInvitation,
  }
}
