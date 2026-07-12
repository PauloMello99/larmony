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
} from "../domain/ports/payment-gateway.port";
import { StripeNotConfiguredException } from "../domain/exceptions/stripe-not-configured.exception";

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

  constructor(config: ConfigService) {
    const apiKey = config.get<string>("STRIPE_SECRET_KEY");
    this.client = apiKey ? new Stripe(apiKey) : null;
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

  private requireClient(): Stripe {
    if (!this.client) throw new StripeNotConfiguredException();
    return this.client;
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
