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
// O Free NÃO é um produto no Stripe: é o estado padrão de um lar sem assinatura
// paga (subscription.type = "free"), resolvido inteiramente pelos entitlements —
// não passa por checkout. Só planos vendáveis entram no catálogo.
// `productKey`/`key` seguem "premium" (identificadores internos estáveis; os
// entitlements mapeiam por status da subscription, não pelo produto); o nome
// exibido no Stripe/checkout/recibos é "Larmony Family".
export const PLAN_CATALOG: PlanDefinition[] = [
  {
    key: "premium_monthly",
    productKey: "premium",
    productName: "Larmony Family",
    amountCents: 1490,
    currency: "brl",
    interval: "month",
  },
];

/** Plano vendido no checkout — o Free (R$ 0) é só espelho de catálogo. */
export const DEFAULT_PLAN_KEY = "premium_monthly";
