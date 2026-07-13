/**
 * Modelo de entitlements (ADR-0026 §7, entrega B-4; régua final do D-1
 * resolvida no adendo — ver ADR-0026). Fonte única do mapa plano →
 * capabilities/limits usado pelo `EntitlementsService` e pelo gate por rota
 * (`@RequireCapability` + `HouseholdEntitlementGuard`) ou por contagem
 * (use-cases de criação injetam `EntitlementsService` diretamente).
 *
 * `ResolvedPlan` colapsa os 4 valores do enum `subscription_type`
 * (`free|trial|standard|custom`) nos 3 planos que importam para gating:
 * `free`, `premium` (trial/standard) e `custom` (isenção/comp — recebe o mesmo
 * que premium, ADR-0026 §2).
 *
 * Adicionar uma nova capability booleana = 1 entrada em `CAPABILITIES` + a
 * coluna correspondente no mapa. Limites numéricos (contagem) vivem em
 * `PLAN_LIMITS`, separados das capabilities booleanas.
 */
export type ResolvedPlan = "free" | "premium" | "custom";

export const CAPABILITIES = [
  "advanced_reports",
  "report_export",
  "custom_categories",
] as const;
export type Capability = (typeof CAPABILITIES)[number];

/** premium e custom (comp) recebem tudo; free é o subset limitado. */
export const PLAN_CAPABILITIES: Record<
  ResolvedPlan,
  Record<Capability, boolean>
> = {
  free: { advanced_reports: false, report_export: false, custom_categories: false },
  premium: { advanced_reports: true, report_export: true, custom_categories: true },
  custom: { advanced_reports: true, report_export: true, custom_categories: true },
};

export function capabilitiesFor(plan: ResolvedPlan): Record<Capability, boolean> {
  return PLAN_CAPABILITIES[plan];
}

/**
 * Limites de contagem por plano (régua do Free, D-1). `Infinity` = sem limite
 * prático (premium/custom). Os use-cases de criação (household/goal/budget) e
 * de convite (member) checam a contagem atual contra estes tetos antes de
 * criar — não se encaixam no gate booleano por rota porque dependem de contar
 * registros existentes, não só do plano do lar.
 */
export interface PlanLimits {
  /** Lares que o usuário pode ser OWNER simultaneamente (billing é por lar). */
  maxHouseholdsOwned: number;
  /** Membros por lar, incluindo o dono. */
  maxMembersPerHousehold: number;
  /** Metas simultâneas no lar (sem conceito de "concluída" hoje — é o total). */
  maxActiveGoals: number;
  /** Séries de orçamento com `endedFrom IS NULL` (abertas) no lar. */
  maxActiveBudgets: number;
}

export const PLAN_LIMITS: Record<ResolvedPlan, PlanLimits> = {
  free: {
    maxHouseholdsOwned: 1,
    maxMembersPerHousehold: 2,
    maxActiveGoals: 3,
    maxActiveBudgets: 3,
  },
  premium: {
    maxHouseholdsOwned: Infinity,
    maxMembersPerHousehold: Infinity,
    maxActiveGoals: Infinity,
    maxActiveBudgets: Infinity,
  },
  custom: {
    maxHouseholdsOwned: Infinity,
    maxMembersPerHousehold: Infinity,
    maxActiveGoals: Infinity,
    maxActiveBudgets: Infinity,
  },
};

export function limitsFor(plan: ResolvedPlan): PlanLimits {
  return PLAN_LIMITS[plan];
}
