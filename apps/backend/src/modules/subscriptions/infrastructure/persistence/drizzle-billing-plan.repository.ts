import { Inject, Injectable } from "@nestjs/common";
import { eq } from "drizzle-orm";
import { DRIZZLE_ADMIN, type DrizzleDB } from "../../../../database/database.module";
import * as schema from "../../../../database/schema";
import type {
  IBillingPlanRepository,
  UpsertBillingPlanData,
} from "../../domain/billing-plan.repository.interface";
import type { BillingPlanEntity } from "../../domain/billing-plan.entity";
import { BillingPlanMapper } from "./billing-plan.mapper";

/** Config de plataforma (catálogo de planos) — sempre DRIZZLE_ADMIN, mesmo
 *  padrão de `stripe_webhook_events`: sem GRANT/RLS, só backend toca. */
@Injectable()
export class DrizzleBillingPlanRepository implements IBillingPlanRepository {
  constructor(@Inject(DRIZZLE_ADMIN) private readonly db: DrizzleDB) {}

  async findByKey(key: string): Promise<BillingPlanEntity | null> {
    const [row] = await this.db
      .select()
      .from(schema.billingPlans)
      .where(eq(schema.billingPlans.key, key))
      .limit(1);

    return row ? BillingPlanMapper.toDomain(row) : null;
  }

  async upsert(data: UpsertBillingPlanData): Promise<BillingPlanEntity> {
    const [row] = await this.db
      .insert(schema.billingPlans)
      .values({
        key: data.key,
        stripeProductId: data.stripeProductId,
        stripePriceId: data.stripePriceId,
        name: data.name,
        amountCents: data.amountCents,
        currency: data.currency,
        interval: data.interval,
        lastSyncedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: schema.billingPlans.key,
        set: {
          stripeProductId: data.stripeProductId,
          stripePriceId: data.stripePriceId,
          name: data.name,
          amountCents: data.amountCents,
          currency: data.currency,
          interval: data.interval,
          lastSyncedAt: new Date(),
          updatedAt: new Date(),
        },
      })
      .returning();

    if (!row) throw new Error(`Failed to upsert billing plan ${data.key}`);
    return BillingPlanMapper.toDomain(row);
  }
}
