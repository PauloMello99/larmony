import { HandleStripeWebhookUseCase } from "./handle-stripe-webhook.use-case";
import type { IPaymentGateway, StripeWebhookEvent, NormalizedSubscription } from "../../domain/ports/payment-gateway.port";
import type { ISubscriptionRepository } from "../../domain/subscription.repository.interface";
import type { IBillingPlanRepository } from "../../domain/billing-plan.repository.interface";
import type { IStripeWebhookEventRepository } from "../../domain/stripe-webhook-event.repository.interface";

function make() {
  const gateway: jest.Mocked<IPaymentGateway> = {
    createCustomer: jest.fn(),
    createCheckoutSession: jest.fn(),
    createPortalSession: jest.fn(),
    findPriceByLookupKey: jest.fn(),
    ensureProduct: jest.fn(),
    createPrice: jest.fn(),
    constructWebhookEvent: jest.fn(),
    getSubscription: jest.fn(),
    createCoupon: jest.fn(),
    applyCouponToSubscription: jest.fn(),
    removeSubscriptionDiscount: jest.fn(),
    cancelSubscription: jest.fn(),
  };
  const subscriptions: jest.Mocked<ISubscriptionRepository> = {
    getOrCreate: jest.fn(),
    setStripeCustomerId: jest.fn(),
    findHouseholdIdByStripeCustomerId: jest.fn(),
    findAllStripeLinked: jest.fn(),
    syncFromStripe: jest.fn().mockResolvedValue(undefined),
    grantComp: jest.fn().mockResolvedValue(undefined),
    revokeComp: jest.fn().mockResolvedValue(undefined),
    setDiscountCache: jest.fn().mockResolvedValue(undefined),
    clearDiscountCache: jest.fn().mockResolvedValue(undefined),
    findExpired: jest.fn().mockResolvedValue([]),
    expireTrial: jest.fn().mockResolvedValue(undefined),
  };
  const billingPlans: jest.Mocked<IBillingPlanRepository> = {
    findByKey: jest.fn(),
    upsert: jest.fn(),
    updateFromStripeProduct: jest.fn().mockResolvedValue(undefined),
    updateFromStripePrice: jest.fn().mockResolvedValue(undefined),
  };
  const events: jest.Mocked<IStripeWebhookEventRepository> = {
    claim: jest.fn().mockResolvedValue(true),
    markProcessed: jest.fn().mockResolvedValue(undefined),
  };
  const useCase = new HandleStripeWebhookUseCase(
    gateway,
    subscriptions,
    billingPlans,
    events,
  );
  return { useCase, gateway, subscriptions, billingPlans, events };
}

const normalizedSub: NormalizedSubscription = {
  id: "sub_1",
  customerId: "cus_1",
  status: "active",
  currentPeriodStart: new Date("2026-07-01T00:00:00Z"),
  currentPeriodEnd: new Date("2026-08-01T00:00:00Z"),
  priceCents: 1490,
  interval: "monthly",
  cancelAtPeriodEnd: false,
  canceledAt: null,
};

function event(partial: Partial<StripeWebhookEvent>): StripeWebhookEvent {
  return { id: "evt_1", type: "customer.subscription.updated", ...partial };
}

describe("HandleStripeWebhookUseCase", () => {
  it("propaga erro de assinatura inválida (gateway lança)", async () => {
    const { useCase, gateway } = make();
    gateway.constructWebhookEvent.mockImplementation(() => {
      throw new Error("invalid signature");
    });
    await expect(useCase.execute("body", "sig")).rejects.toThrow("invalid signature");
  });

  it("idempotência: evento já reivindicado → no-op (não roteia nem marca processado)", async () => {
    const { useCase, gateway, subscriptions, events } = make();
    gateway.constructWebhookEvent.mockReturnValue(event({ subscription: normalizedSub }));
    events.claim.mockResolvedValue(false);

    await useCase.execute("body", "sig");

    expect(subscriptions.syncFromStripe).not.toHaveBeenCalled();
    expect(events.markProcessed).not.toHaveBeenCalled();
  });

  it("customer.subscription.updated → resolve household e sincroniza", async () => {
    const { useCase, gateway, subscriptions, events } = make();
    gateway.constructWebhookEvent.mockReturnValue(event({ subscription: normalizedSub }));
    subscriptions.findHouseholdIdByStripeCustomerId.mockResolvedValue("hh_1");

    await useCase.execute("body", "sig");

    expect(subscriptions.findHouseholdIdByStripeCustomerId).toHaveBeenCalledWith("cus_1");
    expect(subscriptions.syncFromStripe).toHaveBeenCalledWith(
      "hh_1",
      expect.objectContaining({ stripeSubscriptionId: "sub_1", status: "active", type: "standard" }),
    );
    expect(events.markProcessed).toHaveBeenCalledWith("evt_1");
  });

  it("customer.subscription sem household correspondente → não sincroniza (mas marca processado)", async () => {
    const { useCase, gateway, subscriptions, events } = make();
    gateway.constructWebhookEvent.mockReturnValue(event({ subscription: normalizedSub }));
    subscriptions.findHouseholdIdByStripeCustomerId.mockResolvedValue(null);

    await useCase.execute("body", "sig");

    expect(subscriptions.syncFromStripe).not.toHaveBeenCalled();
    expect(events.markProcessed).toHaveBeenCalledWith("evt_1");
  });

  it("checkout.session.completed → retrieve da assinatura + sync no household do metadata", async () => {
    const { useCase, gateway, subscriptions } = make();
    gateway.constructWebhookEvent.mockReturnValue(
      event({
        type: "checkout.session.completed",
        checkoutHouseholdId: "hh_2",
        checkoutSubscriptionId: "sub_9",
      }),
    );
    gateway.getSubscription.mockResolvedValue({ ...normalizedSub, id: "sub_9" });

    await useCase.execute("body", "sig");

    expect(gateway.getSubscription).toHaveBeenCalledWith("sub_9");
    expect(subscriptions.syncFromStripe).toHaveBeenCalledWith(
      "hh_2",
      expect.objectContaining({ stripeSubscriptionId: "sub_9" }),
    );
  });

  it("product.updated → espelha nome no catálogo", async () => {
    const { useCase, gateway, billingPlans } = make();
    gateway.constructWebhookEvent.mockReturnValue(
      event({ type: "product.updated", product: { id: "prod_1", name: "Novo Nome", active: true } }),
    );

    await useCase.execute("body", "sig");

    expect(billingPlans.updateFromStripeProduct).toHaveBeenCalledWith("prod_1", { name: "Novo Nome" });
  });

  it("price.deleted → marca o plano local como inativo", async () => {
    const { useCase, gateway, billingPlans } = make();
    gateway.constructWebhookEvent.mockReturnValue(
      event({
        type: "price.deleted",
        price: { id: "price_1", productId: "prod_1", active: true, unitAmountCents: 1490, currency: "brl", interval: "monthly" },
      }),
    );

    await useCase.execute("body", "sig");

    expect(billingPlans.updateFromStripePrice).toHaveBeenCalledWith(
      "price_1",
      expect.objectContaining({ active: false }),
    );
  });
});
