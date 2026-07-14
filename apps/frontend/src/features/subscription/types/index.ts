// Espelha o contrato do backend (subscriptions module, M16 — pago-only + 2 tiers).
// GET /households/:id/subscription → entidade + bloco `entitlements`.

export type SubscriptionPlanType = "free" | "trial" | "standard" | "custom"
export type SubscriptionStatus = "active" | "trialing" | "past_due" | "canceled"
/** `locked` = sem assinatura ativa (somente-leitura); `essencial`/`completo` = tiers pagos. */
export type ResolvedPlan = "locked" | "essencial" | "completo"
export type EntitlementSource = "stripe" | "comp" | "trial" | "locked"

/** Capabilities Completo-only expostas pelo backend (M16). */
export interface Capabilities {
  budgets: boolean
  scheduled_entries: boolean
  advanced_reports: boolean
  report_export: boolean
  custom_categories: boolean
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
