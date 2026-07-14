import { Inject, Injectable } from "@nestjs/common";
import { and, eq, isNotNull, lt, or } from "drizzle-orm";
import { DRIZZLE_ADMIN, type DrizzleDB } from "../../../../database/database.module";
import * as schema from "../../../../database/schema";
import type {
  ExpiredSubscription,
  GrantCompInput,
  ISubscriptionRepository,
  StripeLinkedSubscription,
} from "../../domain/subscription.repository.interface";
import type { SubscriptionEntity } from "../../domain/subscription.entity";
import type { SyncFromStripeData } from "../../domain/subscription-sync";
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

  async findHouseholdIdByStripeCustomerId(
    stripeCustomerId: string,
  ): Promise<string | null> {
    const [row] = await this.db
      .select({ householdId: schema.subscriptions.householdId })
      .from(schema.subscriptions)
      .where(eq(schema.subscriptions.stripeCustomerId, stripeCustomerId))
      .limit(1);

    return row?.householdId ?? null;
  }

  async findAllStripeLinked(): Promise<StripeLinkedSubscription[]> {
    const rows = await this.db
      .select({
        householdId: schema.subscriptions.householdId,
        stripeSubscriptionId: schema.subscriptions.stripeSubscriptionId,
      })
      .from(schema.subscriptions)
      .where(isNotNull(schema.subscriptions.stripeSubscriptionId));

    // `stripeSubscriptionId` é notNull no filtro acima — o cast estreita o tipo.
    return rows.map((r) => ({
      householdId: r.householdId,
      stripeSubscriptionId: r.stripeSubscriptionId as string,
    }));
  }

  async syncFromStripe(
    householdId: string,
    data: SyncFromStripeData,
  ): Promise<void> {
    // Comp tem precedência (ADR-0026 §2): não rebaixa um lar isento.
    const [current] = await this.db
      .select({ type: schema.subscriptions.type })
      .from(schema.subscriptions)
      .where(eq(schema.subscriptions.householdId, householdId))
      .limit(1);

    const type = current?.type === "custom" ? "custom" : data.type;

    await this.db
      .update(schema.subscriptions)
      .set({
        stripeSubscriptionId: data.stripeSubscriptionId,
        status: data.status,
        type,
        // Tier do plano pago (M16). Status sem acesso (canceled → type free)
        // zera o tier; senão grava o resolvido do lookup_key.
        tier: type === "free" ? null : data.tier,
        currentPeriodStart: data.currentPeriodStart,
        currentPeriodEnd: data.currentPeriodEnd,
        priceCents: data.priceCents,
        billingInterval: data.interval,
        canceledAt: data.canceledAt,
        updatedAt: new Date(),
      })
      .where(eq(schema.subscriptions.householdId, householdId));
  }

  async grantComp(householdId: string, input: GrantCompInput): Promise<void> {
    await this.db
      .update(schema.subscriptions)
      .set({
        type: "custom",
        status: "active",
        // Comp resolve para completo pelo type, não pelo tier — tier fica null
        // (não há plano pago pactuado).
        tier: null,
        priceCents: 0,
        // A sub Stripe (se havia) é cancelada pelo use-case antes; aqui só
        // desvinculamos — o stripeCustomerId é preservado (permite reverter).
        stripeSubscriptionId: null,
        compReason: input.reason,
        compGrantedBy: input.grantedByUserId,
        compExpiresAt: input.expiresAt,
        updatedAt: new Date(),
      })
      .where(eq(schema.subscriptions.householdId, householdId));
  }

  async revokeComp(householdId: string): Promise<void> {
    // Volta a free — nenhum dado do lar é apagado (downgrade nunca destrói).
    await this.db
      .update(schema.subscriptions)
      .set({
        type: "free",
        status: "active",
        tier: null,
        priceCents: 0,
        compReason: null,
        compGrantedBy: null,
        compExpiresAt: null,
        updatedAt: new Date(),
      })
      .where(eq(schema.subscriptions.householdId, householdId));
  }

  async setDiscountCache(
    householdId: string,
    input: { stripeCouponId: string; discountPercent: number | null },
  ): Promise<void> {
    await this.db
      .update(schema.subscriptions)
      .set({
        stripeCouponId: input.stripeCouponId,
        discountPercent: input.discountPercent,
        updatedAt: new Date(),
      })
      .where(eq(schema.subscriptions.householdId, householdId));
  }

  async clearDiscountCache(householdId: string): Promise<void> {
    await this.db
      .update(schema.subscriptions)
      .set({
        stripeCouponId: null,
        discountPercent: null,
        updatedAt: new Date(),
      })
      .where(eq(schema.subscriptions.householdId, householdId));
  }

  async grantTrial(householdId: string, endsAt: Date): Promise<void> {
    await this.db
      .update(schema.subscriptions)
      .set({
        type: "trial",
        status: "trialing",
        tier: null,
        priceCents: 0,
        trialEndsAt: endsAt,
        // Trial exige lar free — qualquer sub id remanescente é de uma sub já
        // cancelada (registro); limpa como o grantComp faz, senão o source
        // dos entitlements classifica errado (bateria do hardening).
        stripeSubscriptionId: null,
        updatedAt: new Date(),
      })
      .where(eq(schema.subscriptions.householdId, householdId));
  }

  async findExpired(now: Date): Promise<ExpiredSubscription[]> {
    const rows = await this.db
      .select({
        householdId: schema.subscriptions.householdId,
        type: schema.subscriptions.type,
      })
      .from(schema.subscriptions)
      .where(
        or(
          and(
            eq(schema.subscriptions.type, "custom"),
            isNotNull(schema.subscriptions.compExpiresAt),
            lt(schema.subscriptions.compExpiresAt, now),
          ),
          and(
            eq(schema.subscriptions.type, "trial"),
            isNotNull(schema.subscriptions.trialEndsAt),
            lt(schema.subscriptions.trialEndsAt, now),
          ),
        ),
      );

    return rows.map((r) => ({
      householdId: r.householdId,
      kind: r.type === "custom" ? "comp" : "trial",
    }));
  }

  async findHouseholdSlug(householdId: string): Promise<string | null> {
    const [row] = await this.db
      .select({ slug: schema.households.slug })
      .from(schema.households)
      .where(eq(schema.households.id, householdId))
      .limit(1);
    return row?.slug ?? null;
  }

  async expireTrial(householdId: string): Promise<void> {
    // Volta a free — nenhum dado do lar é apagado (downgrade nunca destrói).
    await this.db
      .update(schema.subscriptions)
      .set({
        type: "free",
        status: "active",
        tier: null,
        priceCents: 0,
        trialEndsAt: null,
        updatedAt: new Date(),
      })
      .where(eq(schema.subscriptions.householdId, householdId));
  }
}
