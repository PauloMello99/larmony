import { GrantCompUseCase } from "./grant-comp.use-case";
import { RevokeCompUseCase } from "./revoke-comp.use-case";
import { ApplyDiscountUseCase } from "./apply-discount.use-case";
import { RemoveDiscountUseCase } from "./remove-discount.use-case";
import type { IPaymentGateway } from "../../domain/ports/payment-gateway.port";
import type { ISubscriptionRepository } from "../../domain/subscription.repository.interface";
import type { IUserRepository } from "../../../user/domain/user.repository.interface";
import type { AuditService } from "../../../audit/audit.service";
import { SubscriptionEntity, type SubscriptionEntityProps } from "../../domain/subscription.entity";
import { InvalidDiscountException } from "../../domain/exceptions/invalid-discount.exception";
import { SubscriptionNotStripeLinkedException } from "../../domain/exceptions/subscription-not-stripe-linked.exception";

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

function make() {
  const repo = {
    getOrCreate: jest.fn(),
    grantComp: jest.fn().mockResolvedValue(undefined),
    revokeComp: jest.fn().mockResolvedValue(undefined),
    setDiscountCache: jest.fn().mockResolvedValue(undefined),
    clearDiscountCache: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<ISubscriptionRepository>;
  const gateway = {
    createCoupon: jest.fn().mockResolvedValue({ couponId: "co_1" }),
    applyCouponToSubscription: jest.fn().mockResolvedValue(undefined),
    removeSubscriptionDiscount: jest.fn().mockResolvedValue(undefined),
    cancelSubscription: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<IPaymentGateway>;
  const userRepo = {
    findByAuthId: jest.fn().mockResolvedValue({ id: "user_actor" }),
  } as unknown as jest.Mocked<IUserRepository>;
  const audit = { logByAuthId: jest.fn().mockResolvedValue(undefined) } as unknown as jest.Mocked<AuditService>;
  return { repo, gateway, userRepo, audit };
}

describe("GrantCompUseCase", () => {
  it("cancela a sub Stripe (se houver) e grava comp + audita", async () => {
    const { repo, gateway, userRepo, audit } = make();
    repo.getOrCreate.mockResolvedValue(sub({ stripeSubscriptionId: "sub_x" }));
    const uc = new GrantCompUseCase(repo, gateway, userRepo, audit);

    await uc.execute("hh_1", { reason: "parceria", expiresAt: null }, "auth_1");

    expect(gateway.cancelSubscription).toHaveBeenCalledWith("sub_x");
    expect(repo.grantComp).toHaveBeenCalledWith("hh_1", {
      reason: "parceria",
      grantedByUserId: "user_actor",
      expiresAt: null,
    });
    expect(audit.logByAuthId).toHaveBeenCalledWith(
      "auth_1",
      expect.objectContaining({
        action: "subscription_changed",
        metadata: { operation: "grant_comp", reason: "parceria" },
      }),
    );
  });

  it("sem sub Stripe → não chama cancelSubscription", async () => {
    const { repo, gateway, userRepo, audit } = make();
    repo.getOrCreate.mockResolvedValue(sub({ stripeSubscriptionId: null }));
    const uc = new GrantCompUseCase(repo, gateway, userRepo, audit);

    await uc.execute("hh_1", { reason: "tester", expiresAt: null }, "auth_1");

    expect(gateway.cancelSubscription).not.toHaveBeenCalled();
    expect(repo.grantComp).toHaveBeenCalled();
  });
});

describe("RevokeCompUseCase", () => {
  it("revoga e audita", async () => {
    const { repo, gateway, userRepo, audit } = make();
    void gateway;
    void userRepo;
    repo.getOrCreate.mockResolvedValue(sub({ type: "custom", compReason: "x" }));
    const uc = new RevokeCompUseCase(repo, audit);

    await uc.execute("hh_1", "auth_1");

    expect(repo.revokeComp).toHaveBeenCalledWith("hh_1");
    expect(audit.logByAuthId).toHaveBeenCalledWith(
      "auth_1",
      expect.objectContaining({ metadata: { operation: "revoke_comp" } }),
    );
  });
});

describe("ApplyDiscountUseCase", () => {
  it("percent + amount juntos → InvalidDiscountException", async () => {
    const { repo, gateway, audit } = make();
    const uc = new ApplyDiscountUseCase(repo, gateway, audit);
    await expect(
      uc.execute("hh_1", { percent: 10, amountCents: 100, duration: "once" }, "auth_1"),
    ).rejects.toBeInstanceOf(InvalidDiscountException);
    expect(gateway.createCoupon).not.toHaveBeenCalled();
  });

  it("nenhum dos dois → InvalidDiscountException", async () => {
    const { repo, gateway, audit } = make();
    const uc = new ApplyDiscountUseCase(repo, gateway, audit);
    await expect(
      uc.execute("hh_1", { duration: "once" }, "auth_1"),
    ).rejects.toBeInstanceOf(InvalidDiscountException);
  });

  it("repeating sem durationInMonths → InvalidDiscountException", async () => {
    const { repo, gateway, audit } = make();
    const uc = new ApplyDiscountUseCase(repo, gateway, audit);
    await expect(
      uc.execute("hh_1", { percent: 20, duration: "repeating" }, "auth_1"),
    ).rejects.toBeInstanceOf(InvalidDiscountException);
  });

  it("lar sem sub Stripe → SubscriptionNotStripeLinkedException", async () => {
    const { repo, gateway, audit } = make();
    repo.getOrCreate.mockResolvedValue(sub({ stripeSubscriptionId: null }));
    const uc = new ApplyDiscountUseCase(repo, gateway, audit);
    await expect(
      uc.execute("hh_1", { percent: 20, duration: "forever" }, "auth_1"),
    ).rejects.toBeInstanceOf(SubscriptionNotStripeLinkedException);
  });

  it("percent válido → cria coupon, anexa, cacheia percent e audita", async () => {
    const { repo, gateway, audit } = make();
    repo.getOrCreate.mockResolvedValue(sub({ stripeSubscriptionId: "sub_x" }));
    const uc = new ApplyDiscountUseCase(repo, gateway, audit);

    await uc.execute("hh_1", { percent: 20, duration: "forever" }, "auth_1");

    expect(gateway.createCoupon).toHaveBeenCalledWith(
      expect.objectContaining({ percentOff: 20, duration: "forever" }),
    );
    expect(gateway.applyCouponToSubscription).toHaveBeenCalledWith("sub_x", "co_1");
    expect(repo.setDiscountCache).toHaveBeenCalledWith("hh_1", {
      stripeCouponId: "co_1",
      discountPercent: 20,
    });
    expect(audit.logByAuthId).toHaveBeenCalledWith(
      "auth_1",
      expect.objectContaining({ metadata: { operation: "apply_discount", percent: 20 } }),
    );
  });

  it("valor fixo repeating → coupon com amount_off/currency/duration_in_months, cache percent null", async () => {
    const { repo, gateway, audit } = make();
    repo.getOrCreate.mockResolvedValue(sub({ stripeSubscriptionId: "sub_x" }));
    const uc = new ApplyDiscountUseCase(repo, gateway, audit);

    await uc.execute(
      "hh_1",
      { amountCents: 500, duration: "repeating", durationInMonths: 3 },
      "auth_1",
    );

    expect(gateway.createCoupon).toHaveBeenCalledWith({
      percentOff: undefined,
      amountOffCents: 500,
      currency: "brl",
      duration: "repeating",
      durationInMonths: 3,
    });
    expect(repo.setDiscountCache).toHaveBeenCalledWith("hh_1", {
      stripeCouponId: "co_1",
      discountPercent: null,
    });
  });
});

describe("RemoveDiscountUseCase", () => {
  it("sem sub Stripe → SubscriptionNotStripeLinkedException", async () => {
    const { repo, gateway, audit } = make();
    repo.getOrCreate.mockResolvedValue(sub({ stripeSubscriptionId: null }));
    const uc = new RemoveDiscountUseCase(repo, gateway, audit);
    await expect(uc.execute("hh_1", "auth_1")).rejects.toBeInstanceOf(
      SubscriptionNotStripeLinkedException,
    );
  });

  it("com sub → remove no Stripe, limpa cache e audita", async () => {
    const { repo, gateway, audit } = make();
    repo.getOrCreate.mockResolvedValue(sub({ stripeSubscriptionId: "sub_x", stripeCouponId: "co_1" }));
    const uc = new RemoveDiscountUseCase(repo, gateway, audit);

    await uc.execute("hh_1", "auth_1");

    expect(gateway.removeSubscriptionDiscount).toHaveBeenCalledWith("sub_x");
    expect(repo.clearDiscountCache).toHaveBeenCalledWith("hh_1");
    expect(audit.logByAuthId).toHaveBeenCalledWith(
      "auth_1",
      expect.objectContaining({ metadata: { operation: "remove_discount" } }),
    );
  });
});
