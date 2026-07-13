import { EntitlementsService } from "./entitlements.service";
import type { ISubscriptionRepository } from "../domain/subscription.repository.interface";
import { SubscriptionEntity, type SubscriptionEntityProps } from "../domain/subscription.entity";

function make() {
  const repo = {
    getOrCreate: jest.fn(),
  } as unknown as jest.Mocked<ISubscriptionRepository>;
  const service = new EntitlementsService(repo);
  return { service, repo };
}

function sub(overrides: Partial<SubscriptionEntityProps> = {}): SubscriptionEntity {
  return SubscriptionEntity.create({
    id: "sub-row-1",
    householdId: "hh_1",
    stripeCustomerId: null,
    stripeSubscriptionId: null,
    type: "free",
    status: "active",
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

describe("EntitlementsService.resolve", () => {
  it("free → plano free, sem advanced_reports, source free, limites do Free", async () => {
    const { service, repo } = make();
    repo.getOrCreate.mockResolvedValue(sub({ type: "free" }));

    const ent = await service.resolve("hh_1");

    expect(ent.plan).toBe("free");
    expect(ent.capabilities.advanced_reports).toBe(false);
    expect(ent.capabilities.report_export).toBe(false);
    expect(ent.capabilities.custom_categories).toBe(false);
    expect(ent.source).toBe("free");
    expect(ent.limits).toEqual({
      maxHouseholdsOwned: 1,
      maxMembersPerHousehold: 2,
      maxActiveGoals: 3,
      maxActiveBudgets: 3,
    });
  });

  it("standard com sub Stripe → premium, advanced_reports true, source stripe", async () => {
    const { service, repo } = make();
    repo.getOrCreate.mockResolvedValue(
      sub({ type: "standard", status: "active", stripeSubscriptionId: "sub_x" }),
    );

    const ent = await service.resolve("hh_1");

    expect(ent.plan).toBe("premium");
    expect(ent.capabilities.advanced_reports).toBe(true);
    expect(ent.limits.maxHouseholdsOwned).toBe(Infinity);
    expect(ent.source).toBe("stripe");
  });

  it("trial → premium (advanced_reports true)", async () => {
    const { service, repo } = make();
    repo.getOrCreate.mockResolvedValue(sub({ type: "trial", status: "trialing" }));

    const ent = await service.resolve("hh_1");

    expect(ent.plan).toBe("premium");
    expect(ent.capabilities.advanced_reports).toBe(true);
  });

  it("trial com sub Stripe cancelada remanescente → source trial (não stripe)", async () => {
    // Regressão da bateria do hardening: o id da sub cancelada fica gravado
    // para registro e classificava um lar em trial como source=stripe.
    const { service, repo } = make();
    repo.getOrCreate.mockResolvedValue(
      sub({ type: "trial", status: "trialing", stripeSubscriptionId: "sub_cancelada" }),
    );

    const ent = await service.resolve("hh_1");

    expect(ent.source).toBe("trial");
    expect(ent.plan).toBe("premium");
  });

  it("custom (comp) → capabilities premium + source comp", async () => {
    const { service, repo } = make();
    repo.getOrCreate.mockResolvedValue(
      sub({ type: "custom", compReason: "parceria" }),
    );

    const ent = await service.resolve("hh_1");

    expect(ent.plan).toBe("custom");
    expect(ent.capabilities.advanced_reports).toBe(true);
    expect(ent.source).toBe("comp");
  });
});
