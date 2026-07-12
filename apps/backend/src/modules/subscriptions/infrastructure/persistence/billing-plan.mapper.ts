import { BillingPlanEntity } from "../../domain/billing-plan.entity";

interface BillingPlanRow {
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

export class BillingPlanMapper {
  static toDomain(row: BillingPlanRow): BillingPlanEntity {
    return BillingPlanEntity.create({
      id: row.id,
      key: row.key,
      stripeProductId: row.stripeProductId,
      stripePriceId: row.stripePriceId,
      name: row.name,
      amountCents: row.amountCents,
      currency: row.currency,
      interval: row.interval,
      active: row.active,
      lastSyncedAt: row.lastSyncedAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }
}
