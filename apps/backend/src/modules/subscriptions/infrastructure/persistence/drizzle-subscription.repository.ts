import { Inject, Injectable } from "@nestjs/common";
import { eq } from "drizzle-orm";
import { DRIZZLE_ADMIN, type DrizzleDB } from "../../../../database/database.module";
import * as schema from "../../../../database/schema";
import type { ISubscriptionRepository } from "../../domain/subscription.repository.interface";
import type { SubscriptionEntity } from "../../domain/subscription.entity";
import { SubscriptionMapper } from "./subscription.mapper";

/**
 * Sempre via DRIZZLE_ADMIN (nunca DRIZZLE): a policy RLS de `subscriptions`
 * (migration 0001/0009) restringe SELECT a super_admin OU household owner,
 * mas o produto exige que QUALQUER membro veja o estado da assinatura — só
 * checkout/portal são owner-only (ver ADR-0026). A autorização real já é
 * decidida pelos guards (HouseholdMembershipGuard/HouseholdOwnerGuard) antes
 * do use-case rodar — mesmo padrão do módulo `admin` (guard gate +
 * DRIZZLE_ADMIN; RLS fica como defesa em profundidade, nunca acionada pelo
 * app neste módulo).
 */
@Injectable()
export class DrizzleSubscriptionRepository implements ISubscriptionRepository {
  constructor(@Inject(DRIZZLE_ADMIN) private readonly db: DrizzleDB) {}

  async getOrCreate(householdId: string): Promise<SubscriptionEntity> {
    await this.db
      .insert(schema.subscriptions)
      .values({ householdId, type: "free", status: "active" })
      .onConflictDoNothing({ target: schema.subscriptions.householdId });

    const [row] = await this.db
      .select()
      .from(schema.subscriptions)
      .where(eq(schema.subscriptions.householdId, householdId))
      .limit(1);

    if (!row) {
      throw new Error(`Failed to get-or-create subscription for household ${householdId}`);
    }
    return SubscriptionMapper.toDomain(row);
  }

  async setStripeCustomerId(
    householdId: string,
    stripeCustomerId: string,
  ): Promise<SubscriptionEntity> {
    const [row] = await this.db
      .update(schema.subscriptions)
      .set({ stripeCustomerId, updatedAt: new Date() })
      .where(eq(schema.subscriptions.householdId, householdId))
      .returning();

    if (!row) throw new Error(`Subscription not found for household ${householdId}`);
    return SubscriptionMapper.toDomain(row);
  }
}
