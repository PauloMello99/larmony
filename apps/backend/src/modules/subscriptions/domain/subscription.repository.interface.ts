import type { SubscriptionEntity } from "./subscription.entity";
import type { SyncFromStripeData } from "./subscription-sync";

export const SUBSCRIPTION_REPOSITORY = Symbol("SUBSCRIPTION_REPOSITORY");

export interface StripeLinkedSubscription {
  householdId: string;
  stripeSubscriptionId: string;
}

export interface GrantCompInput {
  reason: string;
  grantedByUserId: string | null;
  expiresAt: Date | null;
}

/** Assinatura local vencida (comp/trial) — alvo do billing-expiry-sweep. */
export interface ExpiredSubscription {
  householdId: string;
  kind: "comp" | "trial";
}

export interface ISubscriptionRepository {
  /**
   * Garante 1 linha por household — cria free/active se ainda não existir.
   * Necessário porque o backfill da migration 0009 cobriu só os households
   * existentes na época; households criados depois não passam por ele.
   */
  getOrCreate(householdId: string): Promise<SubscriptionEntity>;

  /** Vincula o customer Stripe recém-criado (primeiro checkout do household). */
  setStripeCustomerId(
    householdId: string,
    stripeCustomerId: string,
  ): Promise<SubscriptionEntity>;

  /** Correlaciona um evento do Stripe (customer id) ao household (B-3). */
  findHouseholdIdByStripeCustomerId(
    stripeCustomerId: string,
  ): Promise<string | null>;

  /** Subscriptions com assinatura Stripe vinculada — alvo da reconciliação. */
  findAllStripeLinked(): Promise<StripeLinkedSubscription[]>;

  /**
   * Espelha o estado do Stripe na subscription do lar (webhook/reconciliação).
   * **Comp tem precedência**: se `type='custom'` local, o `type` não é
   * rebaixado (o lar isento continua isento — ADR-0026 §2); os demais campos
   * (status/período/ids) são atualizados normalmente para registro.
   */
  syncFromStripe(householdId: string, data: SyncFromStripeData): Promise<void>;

  /**
   * Concede isenção (comp, ADR-0026 §2, B-7): `type='custom'`, `status='active'`,
   * `priceCents=0`, grava os campos comp_* e limpa o `stripeSubscriptionId`
   * (a assinatura Stripe, se houver, é cancelada pelo use-case antes). Nunca
   * apaga dados do lar.
   */
  grantComp(householdId: string, input: GrantCompInput): Promise<void>;

  /** Revoga a isenção → volta a `free`/`active` e limpa os campos comp_*. */
  revokeComp(householdId: string): Promise<void>;

  /** Cache local de exibição do desconto (fonte de verdade é o Stripe). */
  setDiscountCache(
    householdId: string,
    input: { stripeCouponId: string; discountPercent: number | null },
  ): Promise<void>;

  /** Limpa o cache de desconto (após remover o coupon no Stripe). */
  clearDiscountCache(householdId: string): Promise<void>;

  /**
   * Concede trial administrativo local (H-3): `type='trial'`,
   * `status='trialing'`, `trial_ends_at = endsAt`. 100% local (sem Stripe,
   * sem cartão) — expira via billing-expiry-sweep.
   */
  grantTrial(householdId: string, endsAt: Date): Promise<void>;

  /**
   * Comps/trials locais vencidos em relação a `now` (billing-expiry-sweep):
   * `type='custom'` com `comp_expires_at` passado, e `type='trial'` com
   * `trial_ends_at` passado. Expirações Stripe NÃO entram aqui (o próprio
   * Stripe cancela e o webhook/reconciliação espelham).
   */
  findExpired(now: Date): Promise<ExpiredSubscription[]>;

  /** Encerra um trial local vencido → volta a `free` (nunca apaga dados). */
  expireTrial(householdId: string): Promise<void>;

  /**
   * Slug do lar — usado para montar as URLs de retorno do checkout/portal
   * (a rota do frontend é `/households/:slug/...`, não o UUID; bug pego pela
   * bateria de integração real do hardening).
   */
  findHouseholdSlug(householdId: string): Promise<string | null>;
}
