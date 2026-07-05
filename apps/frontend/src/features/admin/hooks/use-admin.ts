"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiRequest } from "@/infrastructure/api/client"
import { queryKeys } from "@/infrastructure/query/query-keys"
import type {
  AdminHousehold,
  AdminHouseholdDetail,
  AdminUser,
  AdminUserDetail,
  AuditLogFilters,
  AuditLogPage,
  GrowthPoint,
  PlatformRole,
  PlatformStats,
} from "../types"

export function useAdminStats() {
  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.admin.stats(),
    queryFn: () => apiRequest<PlatformStats>("/admin/stats"),
  })
  return {
    stats: data ?? null,
    loading: isLoading,
    error: error instanceof Error ? error.message : null,
  }
}

export function useAdminGrowth() {
  const { data = [], isLoading, error } = useQuery({
    queryKey: queryKeys.admin.growth(),
    queryFn: () => apiRequest<GrowthPoint[]>("/admin/stats/growth"),
  })
  return {
    series: data,
    loading: isLoading,
    error: error instanceof Error ? error.message : null,
  }
}

export function useAdminHouseholdDetail(id: string | undefined) {
  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.admin.householdDetail(id ?? ""),
    queryFn: () => apiRequest<AdminHouseholdDetail>(`/admin/households/${id}`),
    enabled: !!id,
  })
  return {
    household: data ?? null,
    loading: isLoading,
    error: error instanceof Error ? error.message : null,
  }
}

export function useAdminUserDetail(id: string | undefined) {
  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.admin.userDetail(id ?? ""),
    queryFn: () => apiRequest<AdminUserDetail>(`/admin/users/${id}`),
    enabled: !!id,
  })
  return {
    user: data ?? null,
    loading: isLoading,
    error: error instanceof Error ? error.message : null,
  }
}

/** Mutation isolada (usada nas telas de detalhe — não busca a lista inteira). */
export function useSetHouseholdSuspended() {
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: ({ id, suspended }: { id: string; suspended: boolean }) =>
      apiRequest<void>(`/admin/households/${id}/suspend`, {
        method: "PATCH",
        body: JSON.stringify({ suspended }),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.all })
    },
  })
  return (id: string, suspended: boolean) => mutation.mutateAsync({ id, suspended })
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
    error: error instanceof Error ? error.message : null,
  }
}

export function useAdminHouseholds() {
  const queryClient = useQueryClient()

  const { data = [], isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.admin.households(),
    queryFn: () => apiRequest<AdminHousehold[]>("/admin/households"),
  })

  const suspendMutation = useMutation({
    mutationFn: ({ id, suspended }: { id: string; suspended: boolean }) =>
      apiRequest<void>(`/admin/households/${id}/suspend`, {
        method: "PATCH",
        body: JSON.stringify({ suspended }),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.all })
    },
  })

  return {
    households: data,
    loading: isLoading,
    error: error instanceof Error ? error.message : null,
    refetch,
    setSuspended: (id: string, suspended: boolean) =>
      suspendMutation.mutateAsync({ id, suspended }),
  }
}

export function useAdminUsers() {
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
    error: error instanceof Error ? error.message : null,
    refetch,
    setPlatformRole: (id: string, role: PlatformRole) =>
      roleMutation.mutateAsync({ id, role }),
  }
}
