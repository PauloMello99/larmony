export interface PlanDefinition {
  /** Chave estável nossa — vira o `lookup_key` do Price no Stripe. */
  key: string;
  /** Chave estável nossa — vira o `id` customizado do Product no Stripe. */
  productKey: string;
  productName: string;
  amountCents: number;
  currency: string;
  interval: "month" | "year";
}

/**
 * Catálogo declarativo dos planos que o produto vende (M14). Fonte única —
 * `PlanCatalogService` sincroniza isto com o Stripe no boot (cria o que
 * faltar, localiza o que já existe via `lookup_key`) e persiste a
 * referência em `billing_plans`. Adicionar um plano novo = adicionar uma
 * entrada aqui.
 */
export const PLAN_CATALOG: PlanDefinition[] = [
  {
    key: "premium_monthly",
    productKey: "premium",
    productName: "Larmony Premium",
    amountCents: 1490,
    currency: "brl",
    interval: "month",
  },
];

export const DEFAULT_PLAN_KEY = "premium_monthly";
