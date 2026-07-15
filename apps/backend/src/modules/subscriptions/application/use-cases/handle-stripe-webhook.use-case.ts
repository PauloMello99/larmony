import { Inject, Injectable, Logger } from "@nestjs/common";
import {
  PAYMENT_GATEWAY,
  type IPaymentGateway,
} from "../../domain/ports/payment-gateway.port";
import {
  SUBSCRIPTION_REPOSITORY,
  type ISubscriptionRepository,
} from "../../domain/subscription.repository.interface";
import {
  BILLING_PLAN_REPOSITORY,
  type IBillingPlanRepository,
} from "../../domain/billing-plan.repository.interface";
import {
  STRIPE_WEBHOOK_EVENT_REPOSITORY,
  type IStripeWebhookEventRepository,
} from "../../domain/stripe-webhook-event.repository.interface";
import {
  BILLING_INVOICE_EVENT_REPOSITORY,
  type IBillingInvoiceEventRepository,
} from "../../domain/billing-invoice-event.repository.interface";
import { toSyncData } from "../../domain/subscription-sync";
import type { StripeWebhookEvent } from "../../domain/ports/payment-gateway.port";

/**
 * Ponto único de entrada dos webhooks do Stripe (B-3). Verifica a assinatura,
 * garante idempotência via `stripe_webhook_events` e espelha o Stripe no nosso
 * banco (assinaturas + catálogo). Escrita via DRIZZLE_ADMIN (fora de request
 * context, sem RLS — igual ao cron).
 */
@Injectable()
export class HandleStripeWebhookUseCase {
  private readonly logger = new Logger(HandleStripeWebhookUseCase.name);

  constructor(
    @Inject(PAYMENT_GATEWAY) private readonly gateway: IPaymentGateway,
    @Inject(SUBSCRIPTION_REPOSITORY)
    private readonly subscriptions: ISubscriptionRepository,
    @Inject(BILLING_PLAN_REPOSITORY)
    private readonly billingPlans: IBillingPlanRepository,
    @Inject(STRIPE_WEBHOOK_EVENT_REPOSITORY)
    private readonly events: IStripeWebhookEventRepository,
    @Inject(BILLING_INVOICE_EVENT_REPOSITORY)
    private readonly invoiceEvents: IBillingInvoiceEventRepository,
  ) {}

  async execute(payload: Buffer | string, signature: string): Promise<void> {
    // Lança WebhookSignatureInvalidException (→ 400) se a assinatura falhar.
    const event = this.gateway.constructWebhookEvent(payload, signature);

    // Idempotência: já processado → no-op silencioso (200).
    const claimed = await this.events.claim(event.id, event.type);
    if (!claimed) {
      this.logger.debug(`Evento ${event.id} (${event.type}) já processado — ignorado.`);
      return;
    }

    await this.route(event);
    await this.events.markProcessed(event.id);
  }

  private async route(event: StripeWebhookEvent): Promise<void> {
    switch (event.type) {
      case "checkout.session.completed": {
        if (!event.checkoutHouseholdId || !event.checkoutSubscriptionId) return;
        const sub = await this.gateway.getSubscription(
          event.checkoutSubscriptionId,
        );
        if (sub) {
          await this.subscriptions.syncFromStripe(
            event.checkoutHouseholdId,
            toSyncData(sub),
          );
        }
        return;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.subscription;
        if (!sub) return;
        const householdId =
          await this.subscriptions.findHouseholdIdByStripeCustomerId(
            sub.customerId,
          );
        if (householdId) {
          await this.subscriptions.syncFromStripe(householdId, toSyncData(sub));
        }
        return;
      }

      case "product.updated": {
        const p = event.product;
        if (p) await this.billingPlans.updateFromStripeProduct(p.id, { name: p.name });
        return;
      }

      case "price.updated":
      case "price.deleted": {
        const price = event.price;
        if (price) {
          await this.billingPlans.updateFromStripePrice(price.id, {
            active: event.type === "price.deleted" ? false : price.active,
            amountCents: price.unitAmountCents,
            currency: price.currency,
            interval: price.interval,
          });
        }
        return;
      }

      case "invoice.paid":
      case "invoice.payment_failed": {
        const invoice = event.invoice;
        if (!invoice) return;
        // Resolve o lar pelo customer — invoice sem customer conhecido
        // (não deveria acontecer, mas o Stripe não garante) grava sem lar
        // (household_id NULL, ON DELETE SET NULL) em vez de descartar o evento.
        const householdId = invoice.customerId
          ? await this.subscriptions.findHouseholdIdByStripeCustomerId(invoice.customerId)
          : null;
        await this.invoiceEvents.record({
          stripeInvoiceId: invoice.id,
          householdId,
          type: event.type === "invoice.paid" ? "paid" : "payment_failed",
          amountCents: invoice.amountCents,
          currency: invoice.currency,
          occurredAt: invoice.occurredAt,
        });
        return;
      }

      default:
        // Evento não tratado: já marcado como processado, não re-tenta.
        return;
    }
  }
}
