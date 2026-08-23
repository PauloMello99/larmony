import { SweepStatementImportTimeoutsUseCase } from "./sweep-statement-import-timeouts.use-case";
import type { IStatementImportAdminRepository } from "../../domain/statement-import-admin.repository.interface";

function make() {
  const adminRepo = {
    findCategories: jest.fn(),
    findJobById: jest.fn(),
    completeJob: jest.fn(),
    insertCandidates: jest.fn(),
    sweepTimeouts: jest.fn().mockResolvedValue([]),
  } as unknown as jest.Mocked<IStatementImportAdminRepository>;

  const useCase = new SweepStatementImportTimeoutsUseCase(adminRepo);
  return { useCase, adminRepo };
}

describe("SweepStatementImportTimeoutsUseCase", () => {
  it("chama sweepTimeouts com os thresholds do ADR-0034 (30s csv/ofx, 5min pdf)", async () => {
    const { useCase, adminRepo } = make();

    await useCase.execute();

    expect(adminRepo.sweepTimeouts).toHaveBeenCalledWith("30 seconds", "5 minutes");
  });

  it("nenhum job vencido → timedOut: 0", async () => {
    const { useCase } = make();

    const result = await useCase.execute();

    expect(result).toEqual({ timedOut: 0 });
  });

  it("N jobs vencidos → timedOut: N", async () => {
    const { useCase, adminRepo } = make();
    adminRepo.sweepTimeouts.mockResolvedValue([
      { id: "job_1", householdId: "hh_1" },
      { id: "job_2", householdId: "hh_2" },
    ]);

    const result = await useCase.execute();

    expect(result).toEqual({ timedOut: 2 });
  });
});
