"use client"

import { useMutation } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { apiRequest } from "@/infrastructure/api/client"
import { translateApiError } from "@/shared/lib/api-error"
import { readLocaleCookie } from "@/shared/lib/locale"
import type { StripeRedirect } from "../types"

/**
 * Checkout e portal do Stripe. Ambos devolvem `{ url }` (fluxo hospedado — sem
 * PCI no front, ADR-0026 §5); a UI redireciona o browser pra essa URL. O
 * retorno cai em `.../settings/subscription?checkout=success|cancel` (URLs
 * montadas no backend a partir de FRONTEND_URL). O locale ativo vai no body —
 * a página hospedada do Stripe abre no idioma da UI (adendo ADR-0018).
 */
export function useSubscriptionMutations(householdId: string) {
  const { t } = useTranslation("common")
  const checkout = useMutation({
    // planKey: qual plano (Essencial/Completo × mensal/anual) o usuário
    // escolheu — é esse plano que é cobrado ao fim do trial (M16).
    mutationFn: (planKey?: string) =>
      apiRequest<StripeRedirect>(
        `/households/${householdId}/subscription/checkout`,
        { method: "POST", body: JSON.stringify({ locale: readLocaleCookie(), planKey }) },
      ),
    onSuccess: ({ url }) => {
      window.location.assign(url)
    },
  })

  const portal = useMutation({
    mutationFn: () =>
      apiRequest<StripeRedirect>(
        `/households/${householdId}/subscription/portal`,
        { method: "POST", body: JSON.stringify({ locale: readLocaleCookie() }) },
      ),
    onSuccess: ({ url }) => {
      window.location.assign(url)
    },
  })

  return {
    startCheckout: (planKey?: string) => checkout.mutate(planKey),
    checkoutPending: checkout.isPending,
    checkoutError:
      checkout.error instanceof Error ? translateApiError(checkout.error, t) : null,
    openPortal: portal.mutate,
    portalPending: portal.isPending,
    portalError: portal.error instanceof Error ? translateApiError(portal.error, t) : null,
  }
}
