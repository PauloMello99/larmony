import type {
  SubscriptionStatus,
  SubscriptionPlan,
} from "./subscription.entity";
import type {
  NormalizedSubscription,
  BillingInterval,
} from "./ports/payment-gateway.port";

/** Dados que o webhook/reconciliação gravam numa subscription (M14, B-3). */
export interface SyncFromStripeData {
  stripeSubscriptionId: string;
  status: SubscriptionStatus;
  type: SubscriptionPlan;
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
    currentPeriodStart: sub.currentPeriodStart,
    currentPeriodEnd: sub.currentPeriodEnd,
    priceCents: sub.priceCents,
    interval: sub.interval,
    canceledAt: sub.canceledAt,
  };
}
