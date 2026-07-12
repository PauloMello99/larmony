"use client"

import { useMutation } from "@tanstack/react-query"
import { apiRequest } from "@/infrastructure/api/client"
import type { StripeRedirect } from "../types"

/**
 * Checkout e portal do Stripe. Ambos devolvem `{ url }` (fluxo hospedado — sem
 * PCI no front, ADR-0026 §5); a UI redireciona o browser pra essa URL. O
 * retorno cai em `.../settings/subscription?checkout=success|cancel` (URLs
 * montadas no backend a partir de FRONTEND_URL).
 */
export function useSubscriptionMutations(householdId: string) {
  const checkout = useMutation({
    mutationFn: () =>
      apiRequest<StripeRedirect>(
        `/households/${householdId}/subscription/checkout`,
        { method: "POST" },
      ),
    onSuccess: ({ url }) => {
      window.location.assign(url)
    },
  })

  const portal = useMutation({
    mutationFn: () =>
      apiRequest<StripeRedirect>(
        `/households/${householdId}/subscription/portal`,
        { method: "POST" },
      ),
    onSuccess: ({ url }) => {
      window.location.assign(url)
    },
  })

  return {
    startCheckout: checkout.mutate,
    checkoutPending: checkout.isPending,
    checkoutError: checkout.error instanceof Error ? checkout.error.message : null,
    openPortal: portal.mutate,
    portalPending: portal.isPending,
    portalError: portal.error instanceof Error ? portal.error.message : null,
  }
}
