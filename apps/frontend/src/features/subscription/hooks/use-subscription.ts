"use client"

import { useQuery } from "@tanstack/react-query"
import { apiRequest } from "@/infrastructure/api/client"
import { queryKeys } from "@/infrastructure/query/query-keys"
import type { SubscriptionWithEntitlements } from "../types"

/** Estado de assinatura + entitlements resolvidos do lar (contrato B-4). */
export function useSubscription(householdId: string) {
  const query = useQuery({
    queryKey: queryKeys.subscription.detail(householdId),
    queryFn: () =>
      apiRequest<SubscriptionWithEntitlements>(
        `/households/${householdId}/subscription`,
      ),
    enabled: !!householdId,
  })

  return {
    subscription: query.data ?? null,
    entitlements: query.data?.entitlements ?? null,
    loading: query.isLoading,
    error: query.error instanceof Error ? query.error.message : null,
  }
}
