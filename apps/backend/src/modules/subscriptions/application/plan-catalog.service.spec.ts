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
  };
  const repo: jest.Mocked<IBillingPlanRepository> = {
    findByKey: jest.fn(),
    upsert: jest.fn().mockResolvedValue({}),
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
