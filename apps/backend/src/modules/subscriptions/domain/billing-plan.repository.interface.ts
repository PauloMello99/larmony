import type { BillingPlanEntity } from "./billing-plan.entity";

export const BILLING_PLAN_REPOSITORY = Symbol("BILLING_PLAN_REPOSITORY");

export interface UpsertBillingPlanData {
  key: string;
  stripeProductId: string;
  stripePriceId: string;
  name: string;
  amountCents: number;
  currency: string;
  interval: string;
}

export interface UpdateFromStripeProductData {
  name: string;
}

export interface UpdateFromStripePriceData {
  active: boolean;
  amountCents: number | null;
  currency: string | null;
  interval: string | null;
}

export interface IBillingPlanRepository {
  findByKey(key: string): Promise<BillingPlanEntity | null>;
  /** Upsert por `key` — usado pela reconciliação (`PlanCatalogService`). */
  upsert(data: UpsertBillingPlanData): Promise<BillingPlanEntity>;
  /**
   * Espelha uma mudança de Product vinda do webhook (B-3) — atualiza o nome
   * do(s) plano(s) com esse `stripe_product_id`. No-op se nenhum plano local
   * referencia o produto (não inventa plano a partir do dashboard).
   */
  updateFromStripeProduct(
    stripeProductId: string,
    data: UpdateFromStripeProductData,
  ): Promise<void>;
  /**
   * Espelha uma mudança de Price vinda do webhook (B-3) — atualiza o(s)
   * plano(s) com esse `stripe_price_id`. No-op se nenhum plano referencia o preço.
   */
  updateFromStripePrice(
    stripePriceId: string,
    data: UpdateFromStripePriceData,
  ): Promise<void>;
}
