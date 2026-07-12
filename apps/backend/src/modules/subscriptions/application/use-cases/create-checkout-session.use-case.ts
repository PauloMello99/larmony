import { Inject, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  SUBSCRIPTION_REPOSITORY,
  type ISubscriptionRepository,
} from "../../domain/subscription.repository.interface";
import {
  BILLING_PLAN_REPOSITORY,
  type IBillingPlanRepository,
} from "../../domain/billing-plan.repository.interface";
import {
  PAYMENT_GATEWAY,
  type IPaymentGateway,
} from "../../domain/ports/payment-gateway.port";
import { DEFAULT_PLAN_KEY } from "../../domain/plan-catalog";
import { PlanNotAvailableException } from "../../domain/exceptions/plan-not-available.exception";

@Injectable()
export class CreateCheckoutSessionUseCase {
  constructor(
    @Inject(SUBSCRIPTION_REPOSITORY)
    private readonly repo: ISubscriptionRepository,
    @Inject(BILLING_PLAN_REPOSITORY)
    private readonly billingPlanRepo: IBillingPlanRepository,
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

    // Price vem do catálogo local (PlanCatalogService o sincroniza com o
    // Stripe no boot) — nunca de env fixo (ver plan-catalog.ts).
    const plan = await this.billingPlanRepo.findByKey(DEFAULT_PLAN_KEY);
    if (!plan?.stripePriceId) throw new PlanNotAvailableException(DEFAULT_PLAN_KEY);

    const frontendUrl = this.config.getOrThrow<string>("FRONTEND_URL");
    const basePath = `${frontendUrl}/dashboard/households/${householdId}/settings/subscription`;

    return this.gateway.createCheckoutSession({
      customerId,
      priceId: plan.stripePriceId,
      successUrl: `${basePath}?checkout=success`,
      cancelUrl: `${basePath}?checkout=cancel`,
      metadata: { householdId },
    });
  }
}
