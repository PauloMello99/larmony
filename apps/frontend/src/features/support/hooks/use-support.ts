"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { apiRequest } from "@/infrastructure/api/client"
import { queryKeys } from "@/infrastructure/query/query-keys"
import { translateApiError } from "@/shared/lib/api-error"
import type {
  Page,
  SupportTicketCategory,
  SupportTicketDetail,
  SupportTicketRow,
} from "../types"

export function useMySupportTickets(page = 1) {
  const { t } = useTranslation("common")
  const filters = { page }
  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.support.list(filters),
    queryFn: () => apiRequest<Page<SupportTicketRow>>(`/support/tickets?page=${page}`),
  })
  return {
    page: data ?? null,
    loading: isLoading,
    error: error instanceof Error ? translateApiError(error, t) : null,
  }
}

export function useMySupportTicket(id: string | undefined) {
  const { t } = useTranslation("common")
  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.support.detail(id ?? ""),
    queryFn: () => apiRequest<SupportTicketDetail>(`/support/tickets/${id}`),
    enabled: !!id,
  })
  return {
    ticket: data ?? null,
    loading: isLoading,
    error: error instanceof Error ? translateApiError(error, t) : null,
  }
}

export function useCreateSupportTicket() {
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: (v: { category: SupportTicketCategory; subject: string; body: string }) =>
      apiRequest<SupportTicketDetail>("/support/tickets", {
        method: "POST",
        body: JSON.stringify(v),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.support.all })
    },
  })
  return mutation
}

export function useReplyToMySupportTicket(ticketId: string) {
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: (body: string) =>
      apiRequest<void>(`/support/tickets/${ticketId}/messages`, {
        method: "POST",
        body: JSON.stringify({ body }),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.support.detail(ticketId) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.support.list({}) })
    },
  })
  return mutation
}
