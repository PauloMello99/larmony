export type SubscriptionPlan = "free" | "trial" | "standard" | "custom";
export type SubscriptionStatus = "active" | "trialing" | "past_due" | "canceled";
/** Tier do plano pago (M16). Null = sem plano pago ativo. */
export type SubscriptionTier = "essencial" | "completo";

export interface SubscriptionEntityProps {
  id: string;
  householdId: string;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  type: SubscriptionPlan;
  status: SubscriptionStatus;
  /** Tier do plano pago (M16) — resolvido do Price no sync; null se não pago. */
  tier: SubscriptionTier | null;
  /** true após o 1º trial self-serve do lar (M16) — bloqueia trial repetido. */
  trialConsumed: boolean;
  compReason: string | null;
  compExpiresAt: Date | null;
  /** Fim do trial administrativo local (H-3) — aplicado pelo billing-expiry-sweep. */
  trialEndsAt: Date | null;
  /** Coupon Stripe ativo, se houver desconto (cache de exibição — B-7). */
  stripeCouponId: string | null;
  /** % de desconto — cache local só para exibição admin (B-7). */
  discountPercent: number | null;
  createdAt: Date;
  updatedAt: Date;
}

/** Estado de billing do household (M14, ADR-0026) — 1 linha por household. */
export class SubscriptionEntity {
  readonly id: string;
  readonly householdId: string;
  readonly stripeCustomerId: string | null;
  readonly stripeSubscriptionId: string | null;
  readonly type: SubscriptionPlan;
  readonly status: SubscriptionStatus;
  readonly tier: SubscriptionTier | null;
  readonly trialConsumed: boolean;
  readonly compReason: string | null;
  readonly compExpiresAt: Date | null;
  readonly trialEndsAt: Date | null;
  readonly stripeCouponId: string | null;
  readonly discountPercent: number | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  private constructor(props: SubscriptionEntityProps) {
    this.id = props.id;
    this.householdId = props.householdId;
    this.stripeCustomerId = props.stripeCustomerId;
    this.stripeSubscriptionId = props.stripeSubscriptionId;
    this.type = props.type;
    this.status = props.status;
    this.tier = props.tier;
    this.trialConsumed = props.trialConsumed;
    this.compReason = props.compReason;
    this.compExpiresAt = props.compExpiresAt;
    this.trialEndsAt = props.trialEndsAt;
    this.stripeCouponId = props.stripeCouponId;
    this.discountPercent = props.discountPercent;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  static create(props: SubscriptionEntityProps): SubscriptionEntity {
    return new SubscriptionEntity(props);
  }
}
