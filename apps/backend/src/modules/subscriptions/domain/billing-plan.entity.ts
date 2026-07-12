export interface BillingPlanEntityProps {
  id: string;
  key: string;
  stripeProductId: string | null;
  stripePriceId: string | null;
  name: string;
  amountCents: number;
  currency: string;
  interval: string;
  active: boolean;
  lastSyncedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/** Referência local de um plano do catálogo (M14) — espelha o Stripe. */
export class BillingPlanEntity {
  readonly id: string;
  readonly key: string;
  readonly stripeProductId: string | null;
  readonly stripePriceId: string | null;
  readonly name: string;
  readonly amountCents: number;
  readonly currency: string;
  readonly interval: string;
  readonly active: boolean;
  readonly lastSyncedAt: Date | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  private constructor(props: BillingPlanEntityProps) {
    this.id = props.id;
    this.key = props.key;
    this.stripeProductId = props.stripeProductId;
    this.stripePriceId = props.stripePriceId;
    this.name = props.name;
    this.amountCents = props.amountCents;
    this.currency = props.currency;
    this.interval = props.interval;
    this.active = props.active;
    this.lastSyncedAt = props.lastSyncedAt;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  static create(props: BillingPlanEntityProps): BillingPlanEntity {
    return new BillingPlanEntity(props);
  }
}
