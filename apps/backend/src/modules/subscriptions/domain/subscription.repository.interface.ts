import type { SubscriptionEntity } from "./subscription.entity";
import type { SyncFromStripeData } from "./subscription-sync";

export const SUBSCRIPTION_REPOSITORY = Symbol("SUBSCRIPTION_REPOSITORY");

export interface StripeLinkedSubscription {
  householdId: string;
  stripeSubscriptionId: string;
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
}
