import { ReconcileSubscriptionsUseCase } from "./reconcile-subscriptions.use-case";
import type { IPaymentGateway, NormalizedSubscription } from "../../domain/ports/payment-gateway.port";
import type { ISubscriptionRepository } from "../../domain/subscription.repository.interface";

function make() {
  const gateway = {
    getSubscription: jest.fn(),
  } as unknown as jest.Mocked<IPaymentGateway>;
  const subscriptions = {
    findAllStripeLinked: jest.fn(),
    syncFromStripe: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<ISubscriptionRepository>;
  const useCase = new ReconcileSubscriptionsUseCase(gateway, subscriptions);
  return { useCase, gateway, subscriptions };
}

const activeSub: NormalizedSubscription = {
  id: "sub_1",
  customerId: "cus_1",
  status: "active",
  currentPeriodStart: null,
  currentPeriodEnd: null,
  priceCents: 1490,
  interval: "monthly",
  cancelAtPeriodEnd: false,
  canceledAt: null,
};

describe("ReconcileSubscriptionsUseCase", () => {
  it("espelha cada assinatura vinculada e conta os sincronizados", async () => {
    const { useCase, gateway, subscriptions } = make();
    subscriptions.findAllStripeLinked.mockResolvedValue([
      { householdId: "hh_1", stripeSubscriptionId: "sub_1" },
    ]);
    gateway.getSubscription.mockResolvedValue(activeSub);

    const result = await useCase.execute();

    expect(gateway.getSubscription).toHaveBeenCalledWith("sub_1");
    expect(subscriptions.syncFromStripe).toHaveBeenCalledWith(
      "hh_1",
      expect.objectContaining({ status: "active", type: "standard" }),
    );
    expect(result).toEqual({ scanned: 1, synced: 1, canceled: 0 });
  });

  it("assinatura que sumiu do Stripe (null) → sincroniza como cancelada", async () => {
    const { useCase, gateway, subscriptions } = make();
    subscriptions.findAllStripeLinked.mockResolvedValue([
      { householdId: "hh_2", stripeSubscriptionId: "sub_gone" },
    ]);
    gateway.getSubscription.mockResolvedValue(null);

    const result = await useCase.execute();

    expect(subscriptions.syncFromStripe).toHaveBeenCalledWith(
      "hh_2",
      expect.objectContaining({ status: "canceled", type: "free", stripeSubscriptionId: "sub_gone" }),
    );
    expect(result).toEqual({ scanned: 1, synced: 0, canceled: 1 });
  });
});
