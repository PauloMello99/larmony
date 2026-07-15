import type {
  SubscriptionStatus,
  SubscriptionPlan,
  SubscriptionTier,
} from "./subscription.entity";
import type {
  NormalizedSubscription,
  BillingInterval,
} from "./ports/payment-gateway.port";
import { tierFromLookupKey } from "./plan-catalog";

/** Dados que o webhook/reconciliação gravam numa subscription (M14, B-3; tier M16). */
export interface SyncFromStripeData {
  stripeSubscriptionId: string;
  status: SubscriptionStatus;
  type: SubscriptionPlan;
  /** Tier resolvido do `lookup_key` do Price (M16); null se não resolvido. */
  tier: SubscriptionTier | null;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  priceCents: number | null;
  interval: BillingInterval | null;
  canceledAt: Date | null;
}

/**
 * Mapa status do Stripe (8 valores) → nossa enum (4) + `type`. Documentado no
 * plano/ADR-0026: só `active`/`trialing`/`past_due` concedem acesso; todo o
 * resto (`canceled`/`unpaid`/`incomplete`/`incomplete_expired`/`paused`) vira
 * `canceled`/`free`.
 */
export function mapStripeStatus(stripeStatus: string): {
  status: SubscriptionStatus;
  type: SubscriptionPlan;
} {
  switch (stripeStatus) {
    case "active":
      return { status: "active", type: "standard" };
    case "trialing":
      return { status: "trialing", type: "standard" };
    case "past_due":
      return { status: "past_due", type: "standard" };
    default:
      return { status: "canceled", type: "free" };
  }
}

export function toSyncData(sub: NormalizedSubscription): SyncFromStripeData {
  const { status, type } = mapStripeStatus(sub.status);
  return {
    stripeSubscriptionId: sub.id,
    status,
    type,
    // Tier vem do lookup_key do Price; num status sem acesso (canceled) o tier
    // é irrelevante (o lar fica locked) — mas mantemos o que veio, se veio.
    tier: tierFromLookupKey(sub.priceLookupKey),
    currentPeriodStart: sub.currentPeriodStart,
    currentPeriodEnd: sub.currentPeriodEnd,
    priceCents: sub.priceCents,
    interval: sub.interval,
    canceledAt: sub.canceledAt,
  };
}
