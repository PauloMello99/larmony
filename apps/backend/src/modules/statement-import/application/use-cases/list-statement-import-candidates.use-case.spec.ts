import { ListStatementImportCandidatesUseCase } from "./list-statement-import-candidates.use-case";
import type { IStatementImportCandidateRepository } from "../../domain/statement-import-candidate.repository.interface";
import {
  StatementImportCandidateEntity,
  type StatementImportCandidateEntityProps,
} from "../../domain/statement-import-candidate.entity";

function candidate(overrides: Partial<StatementImportCandidateEntityProps> = {}) {
  return StatementImportCandidateEntity.create({
    id: "cand_1",
    jobId: "job_1",
    householdId: "hh_1",
    externalId: "ext_1",
    date: "2026-07-19",
    amountCents: 195000,
    type: "expense",
    description: "Mercado Delta",
    categoryId: null,
    categoryConfidence: "high",
    resolvedBy: "merchant_memory",
    merchantKey: "DELTA SUPERMERCADOS",
    status: "pending_review",
    transactionId: null,
    createdAt: new Date("2026-07-19T10:00:00Z"),
    ...overrides,
  });
}

function make() {
  const candidateRepo = {
    findById: jest.fn(),
    listByJob: jest.fn(),
    markConfirmed: jest.fn(),
    markDismissed: jest.fn(),
  } as unknown as jest.Mocked<IStatementImportCandidateRepository>;

  const useCase = new ListStatementImportCandidatesUseCase(candidateRepo);
  return { useCase, candidateRepo };
}

describe("ListStatementImportCandidatesUseCase", () => {
  it("delega para candidateRepo.listByJob(jobId, householdId)", async () => {
    const { useCase, candidateRepo } = make();
    const rows = [candidate()];
    candidateRepo.listByJob.mockResolvedValue(rows);

    const result = await useCase.execute("job_1", "hh_1");

    expect(candidateRepo.listByJob).toHaveBeenCalledWith("job_1", "hh_1");
    expect(result).toBe(rows);
  });

  it("job sem candidatos (inexistente ou de outro household) → lista vazia", async () => {
    const { useCase, candidateRepo } = make();
    candidateRepo.listByJob.mockResolvedValue([]);

    const result = await useCase.execute("job_unknown", "hh_1");

    expect(result).toEqual([]);
  });
});
