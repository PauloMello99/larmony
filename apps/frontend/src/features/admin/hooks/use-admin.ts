"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { apiRequest } from "@/infrastructure/api/client"
import { queryKeys } from "@/infrastructure/query/query-keys"
import { translateApiError } from "@/shared/lib/api-error"
import type {
  AdminHousehold,
  AdminHouseholdDetail,
  AdminHouseholdFilters,
  AdminPage,
  AdminUser,
  AdminUserDetail,
  AuditLogFilters,
  AuditLogPage,
  GrowthPoint,
  PlatformRole,
  PlatformStats,
} from "../types"

/** Args da suspensão — o flag cancela a sub Stripe viva antes (política M15). */
interface SuspendArgs {
  id: string
  suspended: boolean
  cancelStripeSubscription?: boolean
}

export function useAdminStats() {
  const { t } = useTranslation("common")
  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.admin.stats(),
    queryFn: () => apiRequest<PlatformStats>("/admin/stats"),
  })
  return {
    stats: data ?? null,
    loading: isLoading,
    error: error instanceof Error ? translateApiError(error, t) : null,
  }
}

export function useAdminGrowth() {
  const { t } = useTranslation("common")
  const { data = [], isLoading, error } = useQuery({
    queryKey: queryKeys.admin.growth(),
    queryFn: () => apiRequest<GrowthPoint[]>("/admin/stats/growth"),
  })
  return {
    series: data,
    loading: isLoading,
    error: error instanceof Error ? translateApiError(error, t) : null,
  }
}

export function useAdminHouseholdDetail(id: string | undefined) {
  const { t } = useTranslation("common")
  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.admin.householdDetail(id ?? ""),
    queryFn: () => apiRequest<AdminHouseholdDetail>(`/admin/households/${id}`),
    enabled: !!id,
  })
  return {
    household: data ?? null,
    loading: isLoading,
    error: error instanceof Error ? translateApiError(error, t) : null,
  }
}

export function useAdminUserDetail(id: string | undefined) {
  const { t } = useTranslation("common")
  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.admin.userDetail(id ?? ""),
    queryFn: () => apiRequest<AdminUserDetail>(`/admin/users/${id}`),
    enabled: !!id,
  })
  return {
    user: data ?? null,
    loading: isLoading,
    error: error instanceof Error ? translateApiError(error, t) : null,
  }
}

/** Mutation isolada (usada nas telas de detalhe — não busca a lista inteira). */
export function useSetHouseholdSuspended() {
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: ({ id, suspended, cancelStripeSubscription }: SuspendArgs) =>
      apiRequest<void>(`/admin/households/${id}/suspend`, {
        method: "PATCH",
        body: JSON.stringify({ suspended, cancelStripeSubscription }),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.all })
    },
  })
  return (id: string, suspended: boolean, cancelStripeSubscription?: boolean) =>
    mutation.mutateAsync({ id, suspended, cancelStripeSubscription })
}

export function useSetUserPlatformRole() {
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: PlatformRole }) =>
      apiRequest<void>(`/admin/users/${id}/platform-role`, {
        method: "PATCH",
        body: JSON.stringify({ role }),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.all })
    },
  })
  return (id: string, role: PlatformRole) => mutation.mutateAsync({ id, role })
}

export function useAdminAuditLogs(filters?: AuditLogFilters) {
  const { t } = useTranslation("common")
  const params = new URLSearchParams()
  if (filters?.page) params.set("page", String(filters.page))
  if (filters?.limit) params.set("limit", String(filters.limit))
  if (filters?.householdId) params.set("householdId", filters.householdId)
  if (filters?.actorId) params.set("actorId", filters.actorId)
  if (filters?.action) params.set("action", filters.action)
  if (filters?.entityType) params.set("entityType", filters.entityType)
  if (filters?.from) params.set("from", filters.from)
  if (filters?.to) params.set("to", filters.to)
  const qs = params.toString()

  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.admin.auditLogs(filters as Record<string, unknown>),
    queryFn: () => apiRequest<AuditLogPage>(`/admin/audit-logs${qs ? `?${qs}` : ""}`),
  })
  return {
    page: data ?? null,
    loading: isLoading,
    error: error instanceof Error ? translateApiError(error, t) : null,
  }
}

/** Lista de lares server-side: filtros/paginação/sort viajam na query string. */
export function useAdminHouseholds(filters?: AdminHouseholdFilters) {
  const { t } = useTranslation("common")
  const queryClient = useQueryClient()

  const params = new URLSearchParams()
  if (filters?.page) params.set("page", String(filters.page))
  if (filters?.limit) params.set("limit", String(filters.limit))
  if (filters?.q) params.set("q", filters.q)
  if (filters?.plan) params.set("plan", filters.plan)
  if (filters?.suspended !== undefined) params.set("suspended", String(filters.suspended))
  if (filters?.sortBy) params.set("sortBy", filters.sortBy)
  if (filters?.sortDir) params.set("sortDir", filters.sortDir)
  const qs = params.toString()

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.admin.households(filters as Record<string, unknown>),
    queryFn: () =>
      apiRequest<AdminPage<AdminHousehold>>(`/admin/households${qs ? `?${qs}` : ""}`),
  })

  const suspendMutation = useMutation({
    mutationFn: ({ id, suspended, cancelStripeSubscription }: SuspendArgs) =>
      apiRequest<void>(`/admin/households/${id}/suspend`, {
        method: "PATCH",
        body: JSON.stringify({ suspended, cancelStripeSubscription }),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.all })
    },
  })

  return {
    page: data ?? null,
    loading: isLoading,
    error: error instanceof Error ? translateApiError(error, t) : null,
    refetch,
    setSuspended: (id: string, suspended: boolean, cancelStripeSubscription?: boolean) =>
      suspendMutation.mutateAsync({ id, suspended, cancelStripeSubscription }),
  }
}

/**
 * Mutations de gestão de isenção/desconto (B-7). Invalida a árvore admin e o
 * estado de assinatura do lar-alvo (`queryKeys.subscription.detail`).
 */
export function useAdminBilling() {
  const queryClient = useQueryClient()
  const invalidate = (householdId: string) => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.admin.all })
    void queryClient.invalidateQueries({
      queryKey: queryKeys.subscription.detail(householdId),
    })
  }

  const grantComp = useMutation({
    mutationFn: (v: { householdId: string; reason: string; expiresAt?: string }) =>
      apiRequest<void>(`/admin/households/${v.householdId}/subscription/comp`, {
        method: "POST",
        body: JSON.stringify({ reason: v.reason, expiresAt: v.expiresAt }),
      }),
    onSuccess: (_d, v) => invalidate(v.householdId),
  })

  const revokeComp = useMutation({
    mutationFn: (v: { householdId: string }) =>
      apiRequest<void>(`/admin/households/${v.householdId}/subscription/comp`, {
        method: "DELETE",
      }),
    onSuccess: (_d, v) => invalidate(v.householdId),
  })

  const applyDiscount = useMutation({
    mutationFn: (v: {
      householdId: string
      percent?: number
      amountCents?: number
      duration: "once" | "repeating" | "forever"
      durationInMonths?: number
    }) =>
      apiRequest<void>(`/admin/households/${v.householdId}/subscription/discount`, {
        method: "POST",
        body: JSON.stringify({
          percent: v.percent,
          amountCents: v.amountCents,
          duration: v.duration,
          durationInMonths: v.durationInMonths,
        }),
      }),
    onSuccess: (_d, v) => invalidate(v.householdId),
  })

  const removeDiscount = useMutation({
    mutationFn: (v: { householdId: string }) =>
      apiRequest<void>(`/admin/households/${v.householdId}/subscription/discount`, {
        method: "DELETE",
      }),
    onSuccess: (_d, v) => invalidate(v.householdId),
  })

  const grantTrial = useMutation({
    mutationFn: (v: { householdId: string; months: number }) =>
      apiRequest<void>(`/admin/households/${v.householdId}/subscription/trial`, {
        method: "POST",
        body: JSON.stringify({ months: v.months }),
      }),
    onSuccess: (_d, v) => invalidate(v.householdId),
  })

  const revokeTrial = useMutation({
    mutationFn: (v: { householdId: string }) =>
      apiRequest<void>(`/admin/households/${v.householdId}/subscription/trial`, {
        method: "DELETE",
      }),
    onSuccess: (_d, v) => invalidate(v.householdId),
  })

  return { grantComp, revokeComp, applyDiscount, removeDiscount, grantTrial, revokeTrial }
}

export function useAdminUsers() {
  const { t } = useTranslation("common")
  const queryClient = useQueryClient()

  const { data = [], isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.admin.users(),
    queryFn: () => apiRequest<AdminUser[]>("/admin/users"),
  })

  const roleMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: PlatformRole }) =>
      apiRequest<void>(`/admin/users/${id}/platform-role`, {
        method: "PATCH",
        body: JSON.stringify({ role }),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.all })
    },
  })

  return {
    users: data,
    loading: isLoading,
    error: error instanceof Error ? translateApiError(error, t) : null,
    refetch,
    setPlatformRole: (id: string, role: PlatformRole) =>
      roleMutation.mutateAsync({ id, role }),
  }
}
