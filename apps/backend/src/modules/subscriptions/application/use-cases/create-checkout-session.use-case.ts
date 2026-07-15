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
import { DEFAULT_PLAN_KEY, TRIAL_PERIOD_DAYS } from "../../domain/plan-catalog";
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

  async execute(
    householdId: string,
    ownerEmail: string,
    locale?: string,
    planKey?: string,
  ): Promise<{ url: string }> {
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
    // Stripe no boot) — nunca de env fixo (ver plan-catalog.ts). O usuário
    // escolhe o plano (Essencial/Completo × mensal/anual) no checkout — é esse
    // plano que é cobrado ao fim do trial (M16).
    const key = planKey ?? DEFAULT_PLAN_KEY;
    const plan = await this.billingPlanRepo.findByKey(key);
    if (!plan?.stripePriceId) throw new PlanNotAvailableException(key);

    // Rota real do frontend é /households/:slug/... (não /dashboard nem UUID)
    // — corrigido após a bateria de integração real (webhook local) pegar o
    // retorno do checkout caindo em 404.
    const frontendUrl = this.config.getOrThrow<string>("FRONTEND_URL");
    const slug = await this.repo.findHouseholdSlug(householdId);
    const basePath = slug
      ? `${frontendUrl}/households/${slug}/settings/subscription`
      : `${frontendUrl}/households`;

    // Trial self-serve (M16): 1 por lar. Marcado ANTES da chamada ao Stripe —
    // um checkout abandonado não deve liberar um 2º trial.
    const grantTrial = !subscription.trialConsumed;
    if (grantTrial) await this.repo.markTrialConsumed(householdId);

    return this.gateway.createCheckoutSession({
      customerId,
      priceId: plan.stripePriceId,
      successUrl: `${basePath}?checkout=success`,
      cancelUrl: `${basePath}?checkout=cancel`,
      metadata: { householdId },
      // Página hospedada no idioma ativo da UI (adendo ADR-0018).
      locale,
      trialPeriodDays: grantTrial ? TRIAL_PERIOD_DAYS : undefined,
    });
  }
}
