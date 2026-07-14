import type { SubscriptionTier } from "./subscription.entity";

export interface PlanDefinition {
  /** Chave estável nossa — vira o `lookup_key` do Price no Stripe. */
  key: string;
  /** Chave estável nossa — vira o `id` customizado do Product no Stripe. */
  productKey: string;
  productName: string;
  tier: SubscriptionTier;
  amountCents: number;
  currency: string;
  interval: "month" | "year";
}

/**
 * Catálogo declarativo dos planos vendáveis (M16 — pago-only, 2 tiers). Fonte
 * única — `PlanCatalogService` sincroniza com o Stripe no boot (cria o que
 * faltar, localiza o que já existe via `lookup_key`) e persiste em
 * `billing_plans`. Não há produto "free" (sem assinatura = locked, resolvido
 * pelos entitlements, não passa por checkout).
 *
 * Preços travados 2026-07-14 (pricing-strategist + sign-off): Essencial R$9,90/
 * mês (R$99/ano) · Completo R$19,90/mês (R$199/ano). Anual ≈ 2 meses grátis.
 */
export const PLAN_CATALOG: PlanDefinition[] = [
  {
    key: "essencial_monthly",
    productKey: "essencial",
    productName: "Larmony Essencial",
    tier: "essencial",
    amountCents: 990,
    currency: "brl",
    interval: "month",
  },
  {
    key: "essencial_annual",
    productKey: "essencial",
    productName: "Larmony Essencial",
    tier: "essencial",
    amountCents: 9900,
    currency: "brl",
    interval: "year",
  },
  {
    key: "completo_monthly",
    productKey: "completo",
    productName: "Larmony Completo",
    tier: "completo",
    amountCents: 1990,
    currency: "brl",
    interval: "month",
  },
  {
    key: "completo_annual",
    productKey: "completo",
    productName: "Larmony Completo",
    tier: "completo",
    amountCents: 19900,
    currency: "brl",
    interval: "year",
  },
];

/** Plano pré-selecionado no checkout quando o usuário não escolhe explicitamente. */
export const DEFAULT_PLAN_KEY = "completo_monthly";

/** Resolve o tier a partir do `lookup_key` do Price (ex.: "completo_annual" → "completo"). */
export function tierFromLookupKey(lookupKey: string | null): SubscriptionTier | null {
  if (!lookupKey) return null;
  if (lookupKey.startsWith("completo")) return "completo";
  if (lookupKey.startsWith("essencial")) return "essencial";
  return null;
}
