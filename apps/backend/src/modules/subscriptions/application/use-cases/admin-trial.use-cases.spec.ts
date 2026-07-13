import { GrantTrialUseCase } from "./grant-trial.use-case";
import { RevokeTrialUseCase } from "./revoke-trial.use-case";
import type { ISubscriptionRepository } from "../../domain/subscription.repository.interface";
import type { AuditService } from "../../../audit/audit.service";
import { SubscriptionEntity, type SubscriptionEntityProps } from "../../domain/subscription.entity";
import { TrialNotAllowedException } from "../../domain/exceptions/trial-not-allowed.exception";

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
    grantTrial: jest.fn().mockResolvedValue(undefined),
    expireTrial: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<ISubscriptionRepository>;
  const audit = { logByAuthId: jest.fn().mockResolvedValue(undefined) } as unknown as jest.Mocked<AuditService>;
  return { repo, audit };
}

describe("GrantTrialUseCase", () => {
  it("lar free → grava trial com fim ~N meses à frente e audita", async () => {
    const { repo, audit } = make();
    repo.getOrCreate.mockResolvedValue(sub({ type: "free" }));
    const uc = new GrantTrialUseCase(repo, audit);

    const before = new Date();
    await uc.execute("hh_1", 3, "auth_1");

    expect(repo.grantTrial).toHaveBeenCalledTimes(1);
    const endsAt = repo.grantTrial.mock.calls[0]![1];
    const expected = new Date(before);
    expected.setMonth(expected.getMonth() + 3);
    // Tolerância de alguns segundos entre o "now" do teste e o do use-case.
    expect(Math.abs(endsAt.getTime() - expected.getTime())).toBeLessThan(5000);
    expect(audit.logByAuthId).toHaveBeenCalledWith(
      "auth_1",
      expect.objectContaining({
        action: "subscription_changed",
        metadata: { operation: "grant_trial", months: 3 },
      }),
    );
  });

  it.each(["standard", "custom", "trial"] as const)(
    "lar %s → TrialNotAllowedException",
    async (type) => {
      const { repo, audit } = make();
      repo.getOrCreate.mockResolvedValue(sub({ type }));
      const uc = new GrantTrialUseCase(repo, audit);

      await expect(uc.execute("hh_1", 3, "auth_1")).rejects.toBeInstanceOf(
        TrialNotAllowedException,
      );
      expect(repo.grantTrial).not.toHaveBeenCalled();
    },
  );
});

describe("RevokeTrialUseCase", () => {
  it("lar em trial → expireTrial + audita revoke_trial", async () => {
    const { repo, audit } = make();
    repo.getOrCreate.mockResolvedValue(sub({ type: "trial", status: "trialing" }));
    const uc = new RevokeTrialUseCase(repo, audit);

    await uc.execute("hh_1", "auth_1");

    expect(repo.expireTrial).toHaveBeenCalledWith("hh_1");
    expect(audit.logByAuthId).toHaveBeenCalledWith(
      "auth_1",
      expect.objectContaining({ metadata: { operation: "revoke_trial" } }),
    );
  });

  it("lar que não está em trial → TrialNotAllowedException", async () => {
    const { repo, audit } = make();
    repo.getOrCreate.mockResolvedValue(sub({ type: "free" }));
    const uc = new RevokeTrialUseCase(repo, audit);

    await expect(uc.execute("hh_1", "auth_1")).rejects.toBeInstanceOf(
      TrialNotAllowedException,
    );
    expect(repo.expireTrial).not.toHaveBeenCalled();
  });
});
