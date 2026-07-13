"use client"

import { useQuery } from "@tanstack/react-query"
import { apiRequest } from "@/infrastructure/api/client"
import { queryKeys } from "@/infrastructure/query/query-keys"

export interface HouseholdSummary {
  id: string
  name: string
  slug: string
  logoUrl: string | null
  role: "owner" | "member"
  /** Módulos liberados ao funcionário (owner = acesso total, ignora). */
  permissions: string[]
  /** Fuso IANA do lar (M12) — âncora dos disparos por data. */
  timezone: string
  /** Hora local (0–23) de saída de lembrete/relatório (M12). */
  notificationHour: number
}

export function useHouseholds() {
  const { data = [], isLoading, refetch } = useQuery({
    queryKey: queryKeys.households.list(),
    queryFn: () => apiRequest<HouseholdSummary[]>("/households"),
  })

  return {
    households: data,
    loading: isLoading,
    refetch,
  }
}

/**
 * Resolve uma household pela slug mesmo quando o usuário não é membro — usado pelo
 * super_admin ao gerenciar uma household alheia (backend devolve role "owner").
 * 404 → household inexistente ou sem acesso.
 */
export function useResolveHouseholdBySlug(slug: string | undefined, enabled: boolean) {
  const { data, isLoading, isError } = useQuery({
    queryKey: queryKeys.households.bySlug(slug ?? ""),
    queryFn: () => apiRequest<HouseholdSummary>(`/households/by-slug/${slug}`),
    enabled: enabled && !!slug,
    retry: false,
  })
  return {
    household: data ?? null,
    loading: isLoading,
    notFound: isError,
  }
}

export function useHousehold(householdId: string) {
  const { data, isLoading, isError } = useQuery({
    queryKey: queryKeys.households.detail(householdId),
    queryFn: () => apiRequest<HouseholdSummary>(`/households/${householdId}`),
    // Don't run when householdId is empty (e.g. HouseholdLayout before query param resolves)
    enabled: !!householdId,
  })

  return {
    household: data ?? null,
    loading: isLoading,
    isOwner: data?.role === "owner",
    notFound: isError,
  }
}
