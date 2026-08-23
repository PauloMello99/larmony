import { GetStatementImportJobUseCase } from "./get-statement-import-job.use-case";
import type { IStatementImportJobRepository } from "../../domain/statement-import-job.repository.interface";
import { StatementImportJobNotFoundException } from "../../domain/exceptions/statement-import-job-not-found.exception";
import {
  StatementImportJobEntity,
  type StatementImportJobEntityProps,
} from "../../domain/statement-import-job.entity";

function job(overrides: Partial<StatementImportJobEntityProps> = {}) {
  return StatementImportJobEntity.create({
    id: "job_1",
    householdId: "hh_1",
    createdBy: "user_1",
    source: "csv",
    status: "pending",
    errorCode: null,
    errorMessage: null,
    stats: null,
    createdAt: new Date("2026-08-22T10:00:00Z"),
    completedAt: null,
    ...overrides,
  });
}

function make() {
  const jobRepo = {
    create: jest.fn(),
    findById: jest.fn(),
    markFailedSync: jest.fn(),
  } as unknown as jest.Mocked<IStatementImportJobRepository>;

  const useCase = new GetStatementImportJobUseCase(jobRepo);
  return { useCase, jobRepo };
}

describe("GetStatementImportJobUseCase", () => {
  it("delega para jobRepo.findById(id, householdId) e retorna o job", async () => {
    const { useCase, jobRepo } = make();
    jobRepo.findById.mockResolvedValue(job());

    const result = await useCase.execute("job_1", "hh_1");

    expect(jobRepo.findById).toHaveBeenCalledWith("job_1", "hh_1");
    expect(result.id).toBe("job_1");
  });

  it("job inexistente ou de outro household → StatementImportJobNotFoundException", async () => {
    const { useCase, jobRepo } = make();
    jobRepo.findById.mockResolvedValue(null);

    await expect(useCase.execute("job_x", "hh_1")).rejects.toThrow(
      StatementImportJobNotFoundException,
    );
  });
});
