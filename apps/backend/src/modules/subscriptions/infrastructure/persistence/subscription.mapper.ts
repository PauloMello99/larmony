import {
  SubscriptionEntity,
  type SubscriptionPlan,
  type SubscriptionStatus,
} from "../../domain/subscription.entity";

interface SubscriptionRow {
  id: string;
  householdId: string;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  type: string;
  status: string;
  compReason: string | null;
  compExpiresAt: Date | null;
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
      compReason: row.compReason,
      compExpiresAt: row.compExpiresAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }
}
