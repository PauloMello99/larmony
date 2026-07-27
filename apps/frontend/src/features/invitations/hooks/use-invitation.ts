"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiRequest } from "@/infrastructure/api/client"
import { queryKeys } from "@/infrastructure/query/query-keys"
import type { AcceptInvitationResult, InvitationLookup } from "../types"

/** Consulta pública do convite pelo token (sem auth). */
export function useInvitationLookup(token: string | undefined) {
  return useQuery({
    queryKey: ["invitation", "lookup", token],
    queryFn: () =>
      apiRequest<InvitationLookup>(
        `/invitations/lookup?token=${encodeURIComponent(token!)}`,
        { skipAuth: true },
      ),
    enabled: !!token,
    retry: false,
  })
}

interface AcceptInvitationPayload {
  token: string
  dataSharingAcknowledged: boolean
}

/** Aceite do convite (requer estar logado). */
export function useAcceptInvitation() {
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: ({ token, dataSharingAcknowledged }: AcceptInvitationPayload) =>
      apiRequest<AcceptInvitationResult>("/invitations/accept", {
        method: "POST",
        body: JSON.stringify({ token, dataSharingAcknowledged }),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.households.all })
    },
  })
  return {
    acceptInvitation: (token: string, dataSharingAcknowledged: boolean) =>
      mutation.mutateAsync({ token, dataSharingAcknowledged }),
    accepting: mutation.isPending,
  }
}

/** Recusa do convite (requer estar logado) — remove o convite no backend. */
export function useDeclineInvitation() {
  const mutation = useMutation({
    mutationFn: (token: string) =>
      apiRequest<void>("/invitations/decline", {
        method: "POST",
        body: JSON.stringify({ token }),
      }),
  })
  return {
    declineInvitation: (token: string) => mutation.mutateAsync(token),
    declining: mutation.isPending,
  }
}
