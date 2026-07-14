// Espelha `apps/backend/src/modules/subscriptions/domain/plan-catalog.ts` (M16).
// Preços travados 2026-07-14 (pricing-strategist + sign-off do responsável).
// Hardcoded no cliente (mesmo padrão da landing, `landing.json` pricing) — o
// catálogo de preço é uma decisão de produto, não um dado dinâmico do backend.
export interface ClientPlanOption {
  key: string
  tier: "essencial" | "completo"
  interval: "month" | "year"
  amountCents: number
}

export const CLIENT_PLAN_CATALOG: ClientPlanOption[] = [
  { key: "essencial_monthly", tier: "essencial", interval: "month", amountCents: 990 },
  { key: "essencial_annual", tier: "essencial", interval: "year", amountCents: 9900 },
  { key: "completo_monthly", tier: "completo", interval: "month", amountCents: 1990 },
  { key: "completo_annual", tier: "completo", interval: "year", amountCents: 19900 },
]

export function planFor(
  tier: "essencial" | "completo",
  interval: "month" | "year",
): ClientPlanOption {
  const plan = CLIENT_PLAN_CATALOG.find((p) => p.tier === tier && p.interval === interval)
  if (!plan) throw new Error(`Plano não encontrado: ${tier}/${interval}`)
  return plan
}
