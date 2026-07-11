"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiRequest } from "@/infrastructure/api/client"
import { queryKeys } from "@/infrastructure/query/query-keys"

/** Espelha `PREFERENCE_EVENT_TYPES` do backend (notifications/domain/notification-events.ts). */
export type NotificationEventType =
  | "bill_reminder"
  | "goal_reached"
  | "budget_exceeded"
  | "auto_launch"
  | "monthly_report"

/** In-app é sempre gravado — não entra na matriz de canais configuráveis. */
export type NotificationChannel = "email" | "sms" | "whatsapp"

export interface NotificationPreferenceMatrixItem {
  eventType: NotificationEventType
  email: boolean
  sms: boolean
  whatsapp: boolean
}

interface UpdatePreferencePayload {
  eventType: NotificationEventType
  channel: NotificationChannel
  enabled: boolean
}

export function useNotificationPreferences() {
  const queryClient = useQueryClient()

  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.notificationPreferences.all,
    queryFn: () =>
      apiRequest<NotificationPreferenceMatrixItem[]>("/me/notification-preferences"),
  })

  const updateMutation = useMutation({
    mutationFn: (payload: UpdatePreferencePayload) =>
      apiRequest<void>("/me/notification-preferences", {
        method: "PUT",
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.notificationPreferences.all })
    },
  })

  return {
    matrix: data ?? [],
    loading: isLoading,
    error,
    updatePreference: updateMutation.mutateAsync,
    isSaving: updateMutation.isPending,
  }
}
