export type SubscriptionPlan = "free" | "trial" | "standard" | "custom";
export type SubscriptionStatus = "active" | "trialing" | "past_due" | "canceled";

export interface SubscriptionEntityProps {
  id: string;
  householdId: string;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  type: SubscriptionPlan;
  status: SubscriptionStatus;
  compReason: string | null;
  compExpiresAt: Date | null;
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
  readonly compReason: string | null;
  readonly compExpiresAt: Date | null;
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
    this.compReason = props.compReason;
    this.compExpiresAt = props.compExpiresAt;
    this.stripeCouponId = props.stripeCouponId;
    this.discountPercent = props.discountPercent;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  static create(props: SubscriptionEntityProps): SubscriptionEntity {
    return new SubscriptionEntity(props);
  }
}
