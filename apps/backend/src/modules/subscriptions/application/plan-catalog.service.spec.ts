import { PlanCatalogService } from "./plan-catalog.service";
import type { IPaymentGateway } from "../domain/ports/payment-gateway.port";
import type { IBillingPlanRepository } from "../domain/billing-plan.repository.interface";

function makeService() {
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
  const repo: jest.Mocked<IBillingPlanRepository> = {
    findByKey: jest.fn(),
    upsert: jest.fn().mockResolvedValue({}),
    updateFromStripeProduct: jest.fn(),
    updateFromStripePrice: jest.fn(),
  };
  const service = new PlanCatalogService(gateway, repo);
  return { service, gateway, repo };
}

describe("PlanCatalogService.reconcile", () => {
  it("espelha localmente quando o Price já existe no Stripe (achado por lookup_key)", async () => {
    const { service, gateway, repo } = makeService();
    gateway.findPriceByLookupKey.mockResolvedValue({
      priceId: "price_existing",
      productId: "prod_existing",
    });

    await service.reconcile();

    expect(gateway.ensureProduct).not.toHaveBeenCalled();
    expect(gateway.createPrice).not.toHaveBeenCalled();
    expect(repo.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        key: "premium_monthly",
        stripeProductId: "prod_existing",
        stripePriceId: "price_existing",
      }),
    );
    // Catálogo com 1 plano vendável (premium/Family); Free não é produto no Stripe.
    expect(repo.upsert).toHaveBeenCalledTimes(1);
  });

  it("cria Product + Price no Stripe quando o lookup_key não existe ainda", async () => {
    const { service, gateway, repo } = makeService();
    gateway.findPriceByLookupKey.mockResolvedValue(null);
    gateway.ensureProduct.mockResolvedValue({ productId: "prod_new" });
    gateway.createPrice.mockResolvedValue({ priceId: "price_new" });

    await service.reconcile();

    expect(gateway.ensureProduct).toHaveBeenCalledWith(
      expect.objectContaining({ id: "premium" }),
    );
    expect(gateway.createPrice).toHaveBeenCalledWith(
      expect.objectContaining({ productId: "prod_new", lookupKey: "premium_monthly" }),
    );
    // Só o plano vendável é criado — Free não é produto no Stripe.
    expect(gateway.ensureProduct).toHaveBeenCalledTimes(1);
    expect(gateway.createPrice).toHaveBeenCalledTimes(1);
    expect(repo.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        key: "premium_monthly",
        stripeProductId: "prod_new",
        stripePriceId: "price_new",
      }),
    );
  });

  it("onModuleInit não lança mesmo se a reconciliação falhar (log, não fatal)", async () => {
    const { service, gateway } = makeService();
    gateway.findPriceByLookupKey.mockRejectedValue(new Error("Stripe indisponível"));

    await expect(service.onModuleInit()).resolves.toBeUndefined();
  });
});
