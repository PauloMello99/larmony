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

export interface IBillingPlanRepository {
  findByKey(key: string): Promise<BillingPlanEntity | null>;
  /** Upsert por `key` — usado pela reconciliação (`PlanCatalogService`). */
  upsert(data: UpsertBillingPlanData): Promise<BillingPlanEntity>;
}
