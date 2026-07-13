import { ExpireSubscriptionsUseCase } from "./expire-subscriptions.use-case";
import type { ISubscriptionRepository } from "../../domain/subscription.repository.interface";
import type { AuditService } from "../../../audit/audit.service";

function make() {
  const repo = {
    findExpired: jest.fn(),
    revokeComp: jest.fn().mockResolvedValue(undefined),
    expireTrial: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<ISubscriptionRepository>;
  const audit = { log: jest.fn().mockResolvedValue(undefined) } as unknown as jest.Mocked<AuditService>;
  const useCase = new ExpireSubscriptionsUseCase(repo, audit);
  return { useCase, repo, audit };
}

describe("ExpireSubscriptionsUseCase", () => {
  it("nada vencido → no-op", async () => {
    const { useCase, repo, audit } = make();
    repo.findExpired.mockResolvedValue([]);

    const result = await useCase.execute();

    expect(result).toEqual({ scanned: 0, compExpired: 0, trialExpired: 0 });
    expect(repo.revokeComp).not.toHaveBeenCalled();
    expect(repo.expireTrial).not.toHaveBeenCalled();
    expect(audit.log).not.toHaveBeenCalled();
  });

  it("comp vencido → revokeComp + audit comp_expired (ator sistema)", async () => {
    const { useCase, repo, audit } = make();
    repo.findExpired.mockResolvedValue([{ householdId: "hh_1", kind: "comp" }]);

    const result = await useCase.execute();

    expect(repo.revokeComp).toHaveBeenCalledWith("hh_1");
    expect(repo.expireTrial).not.toHaveBeenCalled();
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: null,
        householdId: "hh_1",
        action: "subscription_changed",
        metadata: { operation: "comp_expired" },
      }),
    );
    expect(result).toEqual({ scanned: 1, compExpired: 1, trialExpired: 0 });
  });

  it("trial vencido → expireTrial + audit trial_expired", async () => {
    const { useCase, repo, audit } = make();
    repo.findExpired.mockResolvedValue([{ householdId: "hh_2", kind: "trial" }]);

    const result = await useCase.execute();

    expect(repo.expireTrial).toHaveBeenCalledWith("hh_2");
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ metadata: { operation: "trial_expired" } }),
    );
    expect(result).toEqual({ scanned: 1, compExpired: 0, trialExpired: 1 });
  });

  it("mistura comp+trial → contadores corretos", async () => {
    const { useCase, repo } = make();
    repo.findExpired.mockResolvedValue([
      { householdId: "hh_1", kind: "comp" },
      { householdId: "hh_2", kind: "trial" },
      { householdId: "hh_3", kind: "trial" },
    ]);

    const result = await useCase.execute();

    expect(result).toEqual({ scanned: 3, compExpired: 1, trialExpired: 2 });
  });
});
