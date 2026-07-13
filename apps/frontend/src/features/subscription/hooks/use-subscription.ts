"use client"

import { useQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { apiRequest } from "@/infrastructure/api/client"
import { queryKeys } from "@/infrastructure/query/query-keys"
import { translateApiError } from "@/shared/lib/api-error"
import type { SubscriptionWithEntitlements } from "../types"

/** Estado de assinatura + entitlements resolvidos do lar (contrato B-4). */
export function useSubscription(householdId: string) {
  const { t } = useTranslation("common")
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
    error: query.error instanceof Error ? translateApiError(query.error, t) : null,
  }
}
