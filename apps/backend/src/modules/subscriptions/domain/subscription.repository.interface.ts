import type { SubscriptionEntity } from "./subscription.entity";

export const SUBSCRIPTION_REPOSITORY = Symbol("SUBSCRIPTION_REPOSITORY");

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
}
