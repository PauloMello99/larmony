"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { apiRequest } from "@/infrastructure/api/client"
import { queryKeys } from "@/infrastructure/query/query-keys"
import { translateApiError } from "@/shared/lib/api-error"
import type {
  AdminBudgetRow,
  AdminCategoryRow,
  AdminGoalRow,
  AdminHousehold,
  AdminHouseholdDetail,
  AdminHouseholdFilters,
  AdminNotificationRow,
  AdminPage,
  AdminScheduledEntryRow,
  AdminTransactionRow,
  AdminUser,
  AdminUserDetail,
  AdminUserFilters,
  AuditLogFilters,
  AuditLogPage,
  BillingGrowthPoint,
  BillingStats,
  GrowthPoint,
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

export function useAdminBillingStats() {
  const { t } = useTranslation("common")
  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.admin.billingStats(),
    queryFn: () => apiRequest<BillingStats>("/admin/stats/billing"),
  })
  return {
    stats: data ?? null,
    loading: isLoading,
    error: error instanceof Error ? translateApiError(error, t) : null,
  }
}

export function useAdminBillingGrowth() {
  const { t } = useTranslation("common")
  const { data = [], isLoading, error } = useQuery({
    queryKey: queryKeys.admin.billingGrowth(),
    queryFn: () => apiRequest<BillingGrowthPoint[]>("/admin/stats/billing/growth"),
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

/** Base das abas paginadas do drill-down (GET /admin/households/:id/<tab>). */
function useAdminHouseholdTab<T>(
  id: string | undefined,
  tab: string,
  params: Record<string, string | number | undefined> = {},
) {
  const { t } = useTranslation("common")
  const search = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "") search.set(k, String(v))
  }
  const qs = search.toString()

  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.admin.householdTab(id ?? "", tab, params),
    queryFn: () =>
      apiRequest<AdminPage<T>>(`/admin/households/${id}/${tab}${qs ? `?${qs}` : ""}`),
    enabled: !!id,
  })
  return {
    page: data ?? null,
    loading: isLoading,
    error: error instanceof Error ? translateApiError(error, t) : null,
  }
}

export function useAdminHouseholdTransactions(
  id: string | undefined,
  params: { page?: number; type?: "income" | "expense" } = {},
) {
  return useAdminHouseholdTab<AdminTransactionRow>(id, "transactions", params)
}

export function useAdminHouseholdCategories(id: string | undefined, page = 1) {
  return useAdminHouseholdTab<AdminCategoryRow>(id, "categories", { page, limit: 50 })
}

export function useAdminHouseholdBudgets(id: string | undefined, page = 1) {
  return useAdminHouseholdTab<AdminBudgetRow>(id, "budgets", { page })
}

export function useAdminHouseholdGoals(id: string | undefined, page = 1) {
  return useAdminHouseholdTab<AdminGoalRow>(id, "goals", { page })
}

export function useAdminHouseholdScheduledEntries(id: string | undefined, page = 1) {
  return useAdminHouseholdTab<AdminScheduledEntryRow>(id, "scheduled-entries", { page })
}

export function useAdminHouseholdNotifications(id: string | undefined, page = 1) {
  return useAdminHouseholdTab<AdminNotificationRow>(id, "notifications", { page })
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

/** Lista de usuários server-side. Sem mutation de role: promote/demote é DB-only (M15). */
export function useAdminUsers(filters?: AdminUserFilters) {
  const { t } = useTranslation("common")

  const params = new URLSearchParams()
  if (filters?.page) params.set("page", String(filters.page))
  if (filters?.limit) params.set("limit", String(filters.limit))
  if (filters?.q) params.set("q", filters.q)
  if (filters?.platformRole) params.set("platformRole", filters.platformRole)
  if (filters?.sortBy) params.set("sortBy", filters.sortBy)
  if (filters?.sortDir) params.set("sortDir", filters.sortDir)
  const qs = params.toString()

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.admin.users(filters as Record<string, unknown>),
    queryFn: () => apiRequest<AdminPage<AdminUser>>(`/admin/users${qs ? `?${qs}` : ""}`),
  })

  return {
    page: data ?? null,
    loading: isLoading,
    error: error instanceof Error ? translateApiError(error, t) : null,
    refetch,
  }
}
