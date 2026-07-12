/**
 * Modelo de entitlements (ADR-0026 §7, entrega B-4). Fonte única do mapa
 * plano → capabilities usado pelo `EntitlementsService` e pelo gate por rota
 * (`@RequireCapability` + `HouseholdEntitlementGuard`).
 *
 * `ResolvedPlan` colapsa os 4 valores do enum `subscription_type`
 * (`free|trial|standard|custom`) nos 3 planos que importam para gating:
 * `free`, `premium` (trial/standard) e `custom` (isenção/comp — recebe o mesmo
 * que premium, ADR-0026 §2).
 *
 * A lista final de capabilities do Free é decisão de produto em aberto (D-1);
 * este arquivo define o mecanismo, não a régua comercial. Adicionar uma nova
 * capability = 1 entrada em `CAPABILITIES` + a coluna correspondente no mapa.
 */
export type ResolvedPlan = "free" | "premium" | "custom";

export const CAPABILITIES = ["advanced_reports"] as const;
export type Capability = (typeof CAPABILITIES)[number];

/** premium e custom (comp) recebem tudo; free é o subset limitado. */
export const PLAN_CAPABILITIES: Record<
  ResolvedPlan,
  Record<Capability, boolean>
> = {
  free: { advanced_reports: false },
  premium: { advanced_reports: true },
  custom: { advanced_reports: true },
};

export function capabilitiesFor(plan: ResolvedPlan): Record<Capability, boolean> {
  return PLAN_CAPABILITIES[plan];
}
