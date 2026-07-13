import { Inject, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  SUBSCRIPTION_REPOSITORY,
  type ISubscriptionRepository,
} from "../../domain/subscription.repository.interface";
import {
  PAYMENT_GATEWAY,
  type IPaymentGateway,
} from "../../domain/ports/payment-gateway.port";
import { NoStripeCustomerException } from "../../domain/exceptions/no-stripe-customer.exception";

@Injectable()
export class CreatePortalSessionUseCase {
  constructor(
    @Inject(SUBSCRIPTION_REPOSITORY)
    private readonly repo: ISubscriptionRepository,
    @Inject(PAYMENT_GATEWAY)
    private readonly gateway: IPaymentGateway,
    private readonly config: ConfigService,
  ) {}

  async execute(householdId: string, locale?: string): Promise<{ url: string }> {
    const subscription = await this.repo.getOrCreate(householdId);
    if (!subscription.stripeCustomerId) {
      throw new NoStripeCustomerException(householdId);
    }

    // Mesmo fix do checkout: a rota real é /households/:slug/... .
    const frontendUrl = this.config.getOrThrow<string>("FRONTEND_URL");
    const slug = await this.repo.findHouseholdSlug(householdId);
    const returnUrl = slug
      ? `${frontendUrl}/households/${slug}/settings/subscription`
      : `${frontendUrl}/households`;

    return this.gateway.createPortalSession({
      customerId: subscription.stripeCustomerId,
      returnUrl,
      // Billing Portal no idioma ativo da UI (adendo ADR-0018).
      locale,
    });
  }
}
