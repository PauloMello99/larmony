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
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  static create(props: SubscriptionEntityProps): SubscriptionEntity {
    return new SubscriptionEntity(props);
  }
}
