import { ExpireSubscriptionsUseCase } from "./expire-subscriptions.use-case";
import type { ISubscriptionRepository } from "../../domain/subscription.repository.interface";
import type { AuditService } from "../../../audit/audit.service";

function make() {
  const repo = {
    findExpired: jest.fn(),
    revokeComp: jest.fn().mockResolvedValue(undefined),
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

    expect(result).toEqual({ scanned: 0, compExpired: 0 });
    expect(repo.revokeComp).not.toHaveBeenCalled();
    expect(audit.log).not.toHaveBeenCalled();
  });

  it("comp vencido → revokeComp + audit comp_expired (ator sistema)", async () => {
    const { useCase, repo, audit } = make();
    repo.findExpired.mockResolvedValue([{ householdId: "hh_1" }]);

    const result = await useCase.execute();

    expect(repo.revokeComp).toHaveBeenCalledWith("hh_1");
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: null,
        householdId: "hh_1",
        action: "subscription_changed",
        metadata: { operation: "comp_expired" },
      }),
    );
    expect(result).toEqual({ scanned: 1, compExpired: 1 });
  });

  it("múltiplos comps vencidos → contador correto", async () => {
    const { useCase, repo } = make();
    repo.findExpired.mockResolvedValue([{ householdId: "hh_1" }, { householdId: "hh_2" }]);

    const result = await useCase.execute();

    expect(repo.revokeComp).toHaveBeenCalledWith("hh_1");
    expect(repo.revokeComp).toHaveBeenCalledWith("hh_2");
    expect(result).toEqual({ scanned: 2, compExpired: 2 });
  });
});
