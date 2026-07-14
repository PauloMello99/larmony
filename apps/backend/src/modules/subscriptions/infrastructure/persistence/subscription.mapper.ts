import {
  SubscriptionEntity,
  type SubscriptionPlan,
  type SubscriptionStatus,
  type SubscriptionTier,
} from "../../domain/subscription.entity";

interface SubscriptionRow {
  id: string;
  householdId: string;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  type: string;
  status: string;
  tier: string | null;
  trialConsumed: boolean;
  compReason: string | null;
  compExpiresAt: Date | null;
  stripeCouponId: string | null;
  discountPercent: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export class SubscriptionMapper {
  static toDomain(row: SubscriptionRow): SubscriptionEntity {
    return SubscriptionEntity.create({
      id: row.id,
      householdId: row.householdId,
      stripeCustomerId: row.stripeCustomerId,
      stripeSubscriptionId: row.stripeSubscriptionId,
      type: row.type as SubscriptionPlan,
      status: row.status as SubscriptionStatus,
      tier: (row.tier as SubscriptionTier | null) ?? null,
      trialConsumed: row.trialConsumed,
      compReason: row.compReason,
      compExpiresAt: row.compExpiresAt,
      stripeCouponId: row.stripeCouponId,
      discountPercent: row.discountPercent,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }
}
