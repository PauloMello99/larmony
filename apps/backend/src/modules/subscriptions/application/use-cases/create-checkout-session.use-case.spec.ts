import { ConfigService } from "@nestjs/config";
import { CreateCheckoutSessionUseCase } from "./create-checkout-session.use-case";
import type { ISubscriptionRepository } from "../../domain/subscription.repository.interface";
import type { IBillingPlanRepository } from "../../domain/billing-plan.repository.interface";
import type { IPaymentGateway } from "../../domain/ports/payment-gateway.port";
import { SubscriptionEntity, type SubscriptionEntityProps } from "../../domain/subscription.entity";
import { PlanNotAvailableException } from "../../domain/exceptions/plan-not-available.exception";

function sub(overrides: Partial<SubscriptionEntityProps> = {}): SubscriptionEntity {
  return SubscriptionEntity.create({
    id: "sub-row-1",
    householdId: "hh_1",
    stripeCustomerId: "cus_1",
    stripeSubscriptionId: null,
    type: "free",
    status: "active",
    tier: null,
    trialConsumed: false,
    compReason: null,
    compExpiresAt: null,
    trialEndsAt: null,
    stripeCouponId: null,
    discountPercent: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });
}

function make() {
  const repo = {
    getOrCreate: jest.fn().mockResolvedValue(sub()),
    setStripeCustomerId: jest.fn(),
    findHouseholdSlug: jest.fn().mockResolvedValue("lar-teste"),
    markTrialConsumed: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<ISubscriptionRepository>;
  const billingPlanRepo = {
    findByKey: jest.fn().mockResolvedValue({ stripePriceId: "price_x" }),
  } as unknown as jest.Mocked<IBillingPlanRepository>;
  const gateway = {
    createCheckoutSession: jest.fn().mockResolvedValue({ url: "https://checkout.stripe.com/x" }),
  } as unknown as jest.Mocked<IPaymentGateway>;
  const config = {
    getOrThrow: jest.fn().mockReturnValue("https://app.larmony.me"),
  } as unknown as jest.Mocked<ConfigService>;
  const uc = new CreateCheckoutSessionUseCase(repo, billingPlanRepo, gateway, config);
  return { uc, repo, billingPlanRepo, gateway };
}

describe("CreateCheckoutSessionUseCase (M16 — trial self-serve + seleção de plano)", () => {
  it("1º checkout (trial_consumed=false) → concede trial de 30 dias e marca consumido", async () => {
    const { uc, repo, gateway } = make();

    await uc.execute("hh_1", "owner@x.com", "pt-BR", "completo_monthly");

    expect(repo.markTrialConsumed).toHaveBeenCalledWith("hh_1");
    expect(gateway.createCheckoutSession).toHaveBeenCalledWith(
      expect.objectContaining({ trialPeriodDays: 30 }),
    );
  });

  it("2º checkout (trial já consumido) → NÃO concede trial nem marca de novo", async () => {
    const { uc, repo, gateway } = make();
    repo.getOrCreate.mockResolvedValue(sub({ trialConsumed: true }));

    await uc.execute("hh_1", "owner@x.com", "pt-BR", "essencial_monthly");

    expect(repo.markTrialConsumed).not.toHaveBeenCalled();
    expect(gateway.createCheckoutSession).toHaveBeenCalledWith(
      expect.objectContaining({ trialPeriodDays: undefined }),
    );
  });

  it("resolve o price pelo planKey escolhido (não sempre o default)", async () => {
    const { uc, billingPlanRepo } = make();

    await uc.execute("hh_1", "owner@x.com", "pt-BR", "essencial_annual");

    expect(billingPlanRepo.findByKey).toHaveBeenCalledWith("essencial_annual");
  });

  it("sem planKey → usa o DEFAULT_PLAN_KEY", async () => {
    const { uc, billingPlanRepo } = make();

    await uc.execute("hh_1", "owner@x.com", "pt-BR");

    expect(billingPlanRepo.findByKey).toHaveBeenCalledWith("completo_monthly");
  });

  it("plano sem stripePriceId sincronizado → PlanNotAvailableException", async () => {
    const { uc, billingPlanRepo } = make();
    billingPlanRepo.findByKey.mockResolvedValue(null);

    await expect(uc.execute("hh_1", "owner@x.com", "pt-BR", "completo_monthly")).rejects.toBeInstanceOf(
      PlanNotAvailableException,
    );
  });

  it("sem customer Stripe ainda → cria e persiste antes do checkout", async () => {
    const { uc, repo, gateway } = make();
    repo.getOrCreate.mockResolvedValue(sub({ stripeCustomerId: null }));
    (gateway as unknown as { createCustomer: jest.Mock }).createCustomer = jest
      .fn()
      .mockResolvedValue({ customerId: "cus_new" });

    await uc.execute("hh_1", "owner@x.com", "pt-BR", "completo_monthly");

    expect(repo.setStripeCustomerId).toHaveBeenCalledWith("hh_1", "cus_new");
    expect(gateway.createCheckoutSession).toHaveBeenCalledWith(
      expect.objectContaining({ customerId: "cus_new" }),
    );
  });
});
