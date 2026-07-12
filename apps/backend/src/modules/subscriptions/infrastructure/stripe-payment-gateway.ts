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

  private requireClient(): Stripe {
    if (!this.client) throw new StripeNotConfiguredException();
    return this.client;
  }
}
