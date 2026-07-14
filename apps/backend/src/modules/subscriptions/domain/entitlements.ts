/**
 * Modelo de entitlements (M16 — overhaul pago-only, supersede a régua D-1 do
 * ADR-0026). Fonte única do mapa plano → capabilities usado pelo
 * `EntitlementsService` e pelos gates por rota:
 * - `@RequireCapability` + `HouseholdEntitlementGuard` → features Completo-only.
 * - `ActiveSubscriptionGuard` → bloqueia escrita quando o plano é `locked`.
 *
 * `ResolvedPlan` (M16):
 * - `locked`   — sem assinatura ativa (nunca assinou / trial expirado /
 *                cancelado): somente-leitura, nenhuma capability.
 * - `essencial`— plano pago de núcleo: escreve o núcleo, sem features avançadas.
 * - `completo` — plano pago completo (também trial e comp): todas as features.
 *
 * Não há mais limites de contagem (régua do Free): assinatura paga = ilimitado;
 * a diferenciação entre tiers é puramente por capability.
 */
export type ResolvedPlan = "locked" | "essencial" | "completo";

export const CAPABILITIES = [
  "budgets",
  "scheduled_entries",
  "advanced_reports",
  "report_export",
  "custom_categories",
] as const;
export type Capability = (typeof CAPABILITIES)[number];

/** Completo recebe tudo; Essencial e locked não têm nenhuma capability avançada. */
export const PLAN_CAPABILITIES: Record<
  ResolvedPlan,
  Record<Capability, boolean>
> = {
  locked: {
    budgets: false,
    scheduled_entries: false,
    advanced_reports: false,
    report_export: false,
    custom_categories: false,
  },
  essencial: {
    budgets: false,
    scheduled_entries: false,
    advanced_reports: false,
    report_export: false,
    custom_categories: false,
  },
  completo: {
    budgets: true,
    scheduled_entries: true,
    advanced_reports: true,
    report_export: true,
    custom_categories: true,
  },
};

export function capabilitiesFor(plan: ResolvedPlan): Record<Capability, boolean> {
  return PLAN_CAPABILITIES[plan];
}
