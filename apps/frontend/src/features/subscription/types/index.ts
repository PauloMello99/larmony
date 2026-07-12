// Espelha o contrato do backend (subscriptions module, ADR-0026 B-4):
// GET /households/:id/subscription → entidade + bloco `entitlements`.

export type SubscriptionPlanType = "free" | "trial" | "standard" | "custom"
export type SubscriptionStatus = "active" | "trialing" | "past_due" | "canceled"
export type ResolvedPlan = "free" | "premium" | "custom"
export type EntitlementSource = "stripe" | "comp" | "trial" | "free"

/** Capabilities hoje expostas pelo backend (D-1 em aberto — só uma por ora). */
export interface Capabilities {
  advanced_reports: boolean
}

export interface ResolvedEntitlements {
  plan: ResolvedPlan
  status: SubscriptionStatus
  source: EntitlementSource
  capabilities: Capabilities
}

export interface SubscriptionWithEntitlements {
  id: string
  householdId: string
  stripeCustomerId: string | null
  stripeSubscriptionId: string | null
  type: SubscriptionPlanType
  status: SubscriptionStatus
  compReason: string | null
  compExpiresAt: string | null
  trialEndsAt: string | null
  stripeCouponId: string | null
  discountPercent: number | null
  createdAt: string
  updatedAt: string
  entitlements: ResolvedEntitlements
}

/** Resposta de checkout/portal — URL hospedada do Stripe p/ redirect. */
export interface StripeRedirect {
  url: string
}
