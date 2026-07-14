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

describe("EntitlementsService.resolve (M16 — 2 tiers)", () => {
  it("free (nunca assinou) → locked, sem capabilities, source locked", async () => {
    const { service, repo } = make();
    repo.getOrCreate.mockResolvedValue(sub({ type: "free" }));

    const ent = await service.resolve("hh_1");

    expect(ent.plan).toBe("locked");
    expect(ent.capabilities.budgets).toBe(false);
    expect(ent.capabilities.advanced_reports).toBe(false);
    expect(ent.source).toBe("locked");
  });

  it("standard/canceled → locked (cancelamento vira read-only)", async () => {
    const { service, repo } = make();
    repo.getOrCreate.mockResolvedValue(
      sub({ type: "free", status: "canceled", stripeSubscriptionId: "sub_x" }),
    );

    const ent = await service.resolve("hh_1");
    expect(ent.plan).toBe("locked");
  });

  it("standard/active tier essencial → essencial, sem features avançadas, source stripe", async () => {
    const { service, repo } = make();
    repo.getOrCreate.mockResolvedValue(
      sub({ type: "standard", status: "active", tier: "essencial", stripeSubscriptionId: "sub_x" }),
    );

    const ent = await service.resolve("hh_1");

    expect(ent.plan).toBe("essencial");
    expect(ent.capabilities.budgets).toBe(false);
    expect(ent.capabilities.scheduled_entries).toBe(false);
    expect(ent.source).toBe("stripe");
  });

  it("standard/active tier completo → completo, todas as features", async () => {
    const { service, repo } = make();
    repo.getOrCreate.mockResolvedValue(
      sub({ type: "standard", status: "active", tier: "completo", stripeSubscriptionId: "sub_x" }),
    );

    const ent = await service.resolve("hh_1");

    expect(ent.plan).toBe("completo");
    expect(ent.capabilities.budgets).toBe(true);
    expect(ent.capabilities.advanced_reports).toBe(true);
    expect(ent.source).toBe("stripe");
  });

  it("standard/trialing → completo (trial dá tudo) independentemente do tier do preço", async () => {
    const { service, repo } = make();
    repo.getOrCreate.mockResolvedValue(
      sub({ type: "standard", status: "trialing", tier: "essencial", stripeSubscriptionId: "sub_x" }),
    );

    const ent = await service.resolve("hh_1");

    expect(ent.plan).toBe("completo");
    expect(ent.capabilities.budgets).toBe(true);
    expect(ent.source).toBe("trial");
  });

  it("standard/past_due → mantém acesso do tier (não vira locked na 1ª falha)", async () => {
    const { service, repo } = make();
    repo.getOrCreate.mockResolvedValue(
      sub({ type: "standard", status: "past_due", tier: "completo", stripeSubscriptionId: "sub_x" }),
    );

    const ent = await service.resolve("hh_1");
    expect(ent.plan).toBe("completo");
  });

  it("standard/active sem tier setado → fallback completo (nunca restringe pagante)", async () => {
    const { service, repo } = make();
    repo.getOrCreate.mockResolvedValue(
      sub({ type: "standard", status: "active", tier: null, stripeSubscriptionId: "sub_x" }),
    );

    const ent = await service.resolve("hh_1");
    expect(ent.plan).toBe("completo");
  });

  it("custom (comp) → completo + source comp", async () => {
    const { service, repo } = make();
    repo.getOrCreate.mockResolvedValue(sub({ type: "custom", compReason: "parceria" }));

    const ent = await service.resolve("hh_1");

    expect(ent.plan).toBe("completo");
    expect(ent.capabilities.advanced_reports).toBe(true);
    expect(ent.source).toBe("comp");
  });
});
