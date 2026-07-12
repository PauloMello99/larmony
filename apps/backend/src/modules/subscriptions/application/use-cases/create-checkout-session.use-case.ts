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

@Injectable()
export class CreateCheckoutSessionUseCase {
  constructor(
    @Inject(SUBSCRIPTION_REPOSITORY)
    private readonly repo: ISubscriptionRepository,
    @Inject(PAYMENT_GATEWAY)
    private readonly gateway: IPaymentGateway,
    private readonly config: ConfigService,
  ) {}

  async execute(householdId: string, ownerEmail: string): Promise<{ url: string }> {
    const subscription = await this.repo.getOrCreate(householdId);

    // Customer sempre pré-criado antes do checkout (ver payment-gateway.port.ts).
    let customerId = subscription.stripeCustomerId;
    if (!customerId) {
      const created = await this.gateway.createCustomer({
        email: ownerEmail,
        metadata: { householdId },
      });
      customerId = created.customerId;
      await this.repo.setStripeCustomerId(householdId, customerId);
    }

    const frontendUrl = this.config.getOrThrow<string>("FRONTEND_URL");
    const priceId = this.config.getOrThrow<string>("STRIPE_PREMIUM_PRICE_ID");
    const basePath = `${frontendUrl}/dashboard/households/${householdId}/settings/subscription`;

    return this.gateway.createCheckoutSession({
      customerId,
      priceId,
      successUrl: `${basePath}?checkout=success`,
      cancelUrl: `${basePath}?checkout=cancel`,
      metadata: { householdId },
    });
  }
}
