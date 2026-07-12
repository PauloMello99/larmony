import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Stripe from "stripe";
import type {
  IPaymentGateway,
  CreateCustomerInput,
  CreateCustomerOutput,
  CreateCheckoutSessionInput,
  CreateCheckoutSessionOutput,
  CreatePortalSessionInput,
  CreatePortalSessionOutput,
  FindPriceByLookupKeyOutput,
  EnsureProductInput,
  EnsureProductOutput,
  CreatePriceInput,
  CreatePriceOutput,
  CreateCouponInput,
  CreateCouponOutput,
  BillingInterval,
  NormalizedSubscription,
  NormalizedPrice,
  StripeWebhookEvent,
} from "../domain/ports/payment-gateway.port";
import { StripeNotConfiguredException } from "../domain/exceptions/stripe-not-configured.exception";
import { WebhookSignatureInvalidException } from "../domain/exceptions/webhook-signature-invalid.exception";

/**
 * Integração real com o Stripe (Checkout + Billing Portal hospedados — sem
 * Stripe Elements no MVP, ver ADR-0026 §5). Sem STRIPE_SECRET_KEY, o app
 * sobe normalmente (dev/CI sem o segredo ainda configurado): cada método
 * lança StripeNotConfiguredException se chamado sem chave — fail loud só no
 * uso, nunca no boot, e nunca finge sucesso (mesmo espírito do padrão
 * SMS/WhatsApp do ADR-0023).
 */
@Injectable()
export class StripePaymentGateway implements IPaymentGateway {
  private readonly logger = new Logger(StripePaymentGateway.name);
  private readonly client: Stripe | null;
  private readonly webhookSecret: string | null;

  constructor(config: ConfigService) {
    const apiKey = config.get<string>("STRIPE_SECRET_KEY");
    this.client = apiKey ? new Stripe(apiKey) : null;
    this.webhookSecret = config.get<string>("STRIPE_WEBHOOK_SECRET") ?? null;
    if (!this.client) {
      this.logger.warn(
        "STRIPE_SECRET_KEY ausente — StripePaymentGateway desabilitado (checkout/portal lançam se chamados).",
      );
    }
  }

  async createCustomer(input: CreateCustomerInput): Promise<CreateCustomerOutput> {
    const client = this.requireClient();
    const customer = await client.customers.create({
      email: input.email,
      metadata: input.metadata,
    });
    return { customerId: customer.id };
  }

  async createCheckoutSession(
    input: CreateCheckoutSessionInput,
  ): Promise<CreateCheckoutSessionOutput> {
    const client = this.requireClient();
    const session = await client.checkout.sessions.create({
      mode: "subscription",
      customer: input.customerId,
      line_items: [{ price: input.priceId, quantity: 1 }],
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
      metadata: input.metadata,
    });

    if (!session.url) throw new Error("Stripe não retornou uma URL de checkout.");
    return { url: session.url };
  }

  async createPortalSession(
    input: CreatePortalSessionInput,
  ): Promise<CreatePortalSessionOutput> {
    const client = this.requireClient();
    const session = await client.billingPortal.sessions.create({
      customer: input.customerId,
      return_url: input.returnUrl,
    });
    return { url: session.url };
  }

  async findPriceByLookupKey(
    lookupKey: string,
  ): Promise<FindPriceByLookupKeyOutput | null> {
    const client = this.requireClient();
    const prices = await client.prices.list({ lookup_keys: [lookupKey], limit: 1 });
    const price = prices.data[0];
    if (!price) return null;

    const productId = typeof price.product === "string" ? price.product : price.product.id;
    return { priceId: price.id, productId };
  }

  async ensureProduct(input: EnsureProductInput): Promise<EnsureProductOutput> {
    const client = this.requireClient();
    try {
      const product = await client.products.retrieve(input.id);
      return { productId: product.id };
    } catch (err) {
      if (!isResourceMissing(err)) throw err;
      const created = await client.products.create({ id: input.id, name: input.name });
      return { productId: created.id };
    }
  }

  async createPrice(input: CreatePriceInput): Promise<CreatePriceOutput> {
    const client = this.requireClient();
    const price = await client.prices.create({
      product: input.productId,
      unit_amount: input.unitAmountCents,
      currency: input.currency,
      recurring: { interval: input.interval },
      lookup_key: input.lookupKey,
    });
    return { priceId: price.id };
  }

  constructWebhookEvent(
    payload: Buffer | string,
    signature: string,
  ): StripeWebhookEvent {
    const client = this.requireClient();
    if (!this.webhookSecret) throw new WebhookSignatureInvalidException();
    let event: Stripe.Event;
    try {
      event = client.webhooks.constructEvent(
        payload,
        signature,
        this.webhookSecret,
      );
    } catch {
      throw new WebhookSignatureInvalidException();
    }
    return normalizeEvent(event);
  }

  async getSubscription(
    subscriptionId: string,
  ): Promise<NormalizedSubscription | null> {
    const client = this.requireClient();
    try {
      const sub = await client.subscriptions.retrieve(subscriptionId);
      return normalizeSubscription(sub);
    } catch (err) {
      if (isResourceMissing(err)) return null;
      throw err;
    }
  }

  async createCoupon(input: CreateCouponInput): Promise<CreateCouponOutput> {
    const client = this.requireClient();
    const params: Stripe.CouponCreateParams = { duration: input.duration };
    if (input.percentOff !== undefined) params.percent_off = input.percentOff;
    if (input.amountOffCents !== undefined) {
      params.amount_off = input.amountOffCents;
      params.currency = input.currency;
    }
    if (input.duration === "repeating") {
      params.duration_in_months = input.durationInMonths;
    }
    const coupon = await client.coupons.create(params);
    return { couponId: coupon.id };
  }

  async applyCouponToSubscription(
    subscriptionId: string,
    couponId: string,
  ): Promise<void> {
    const client = this.requireClient();
    // API v22: desconto via `discounts` (o param `coupon` no update foi deprecado).
    await client.subscriptions.update(subscriptionId, {
      discounts: [{ coupon: couponId }],
    });
  }

  async removeSubscriptionDiscount(subscriptionId: string): Promise<void> {
    const client = this.requireClient();
    await client.subscriptions.deleteDiscount(subscriptionId);
  }

  async cancelSubscription(subscriptionId: string): Promise<void> {
    const client = this.requireClient();
    await client.subscriptions.cancel(subscriptionId);
  }

  private requireClient(): Stripe {
    if (!this.client) throw new StripeNotConfiguredException();
    return this.client;
  }
}

// ─── Normalização Stripe → domínio (mantém o SDK fora do resto do módulo) ───

function unixToDate(secs: number | null | undefined): Date | null {
  return typeof secs === "number" ? new Date(secs * 1000) : null;
}

function normalizeInterval(
  interval: string | undefined,
): BillingInterval | null {
  if (interval === "month") return "monthly";
  if (interval === "year") return "annual";
  return null;
}

function normalizeSubscription(sub: Stripe.Subscription): NormalizedSubscription {
  // API v22: current_period_* e price vivem no item, não no top-level.
  const item = sub.items.data[0];
  return {
    id: sub.id,
    customerId: typeof sub.customer === "string" ? sub.customer : sub.customer.id,
    status: sub.status,
    currentPeriodStart: item ? unixToDate(item.current_period_start) : null,
    currentPeriodEnd: item ? unixToDate(item.current_period_end) : null,
    priceCents: item?.price?.unit_amount ?? null,
    interval: normalizeInterval(item?.price?.recurring?.interval),
    cancelAtPeriodEnd: sub.cancel_at_period_end,
    canceledAt: unixToDate(sub.canceled_at),
  };
}

function normalizePrice(price: Stripe.Price): NormalizedPrice {
  return {
    id: price.id,
    productId: typeof price.product === "string" ? price.product : price.product.id,
    active: price.active,
    unitAmountCents: price.unit_amount ?? null,
    currency: price.currency ?? null,
    interval: normalizeInterval(price.recurring?.interval),
  };
}

function normalizeEvent(event: Stripe.Event): StripeWebhookEvent {
  const base = { id: event.id, type: event.type };
  switch (event.type) {
    case "checkout.session.completed": {
      const s = event.data.object;
      return {
        ...base,
        checkoutHouseholdId: s.metadata?.["householdId"] ?? null,
        checkoutSubscriptionId:
          typeof s.subscription === "string"
            ? s.subscription
            : (s.subscription?.id ?? null),
      };
    }
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
      return { ...base, subscription: normalizeSubscription(event.data.object) };
    case "product.created":
    case "product.updated":
    case "product.deleted": {
      const p = event.data.object;
      return { ...base, product: { id: p.id, name: p.name, active: p.active } };
    }
    case "price.created":
    case "price.updated":
    case "price.deleted":
      return { ...base, price: normalizePrice(event.data.object) };
    default:
      return base;
  }
}

/** Duck-typing (mesmo padrão de isUniqueViolation do Drizzle): evita import
 *  direto da classe de erro do SDK só para checar um campo. */
function isResourceMissing(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: string }).code === "resource_missing"
  );
}
