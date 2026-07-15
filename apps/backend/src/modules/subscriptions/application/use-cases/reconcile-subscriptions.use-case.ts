import { Inject, Injectable, Logger } from "@nestjs/common";
import {
  PAYMENT_GATEWAY,
  type IPaymentGateway,
} from "../../domain/ports/payment-gateway.port";
import {
  SUBSCRIPTION_REPOSITORY,
  type ISubscriptionRepository,
} from "../../domain/subscription.repository.interface";
import { toSyncData } from "../../domain/subscription-sync";

export interface ReconcileResult {
  scanned: number;
  synced: number;
  canceled: number;
}

/**
 * Reconciliação periódica (B-3): re-puxa cada assinatura vinculada do Stripe e
 * espelha o estado. Rede de segurança para webhooks perdidos — o Stripe é a
 * fonte de verdade, então `past_due → canceled` sai naturalmente quando o
 * Stripe cancela (dunning é do Stripe; não recalculamos grace localmente).
 */
@Injectable()
export class ReconcileSubscriptionsUseCase {
  private readonly logger = new Logger(ReconcileSubscriptionsUseCase.name);

  constructor(
    @Inject(PAYMENT_GATEWAY) private readonly gateway: IPaymentGateway,
    @Inject(SUBSCRIPTION_REPOSITORY)
    private readonly subscriptions: ISubscriptionRepository,
  ) {}

  async execute(): Promise<ReconcileResult> {
    const linked = await this.subscriptions.findAllStripeLinked();
    let synced = 0;
    let canceled = 0;

    for (const { householdId, stripeSubscriptionId } of linked) {
      const sub = await this.gateway.getSubscription(stripeSubscriptionId);

      if (!sub) {
        // Sumiu do Stripe → trata como cancelada (sintetiza estado canceled).
        await this.subscriptions.syncFromStripe(householdId, {
          stripeSubscriptionId,
          status: "canceled",
          type: "free",
          tier: null,
          currentPeriodStart: null,
          currentPeriodEnd: null,
          priceCents: null,
          interval: null,
          canceledAt: null,
        });
        canceled += 1;
        continue;
      }

      await this.subscriptions.syncFromStripe(householdId, toSyncData(sub));
      synced += 1;
    }

    const result = { scanned: linked.length, synced, canceled };
    this.logger.log(
      `Reconciliação de billing: scanned=${result.scanned} synced=${result.synced} canceled=${result.canceled}`,
    );
    return result;
  }
}
