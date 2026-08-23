import { DismissStatementImportCandidateUseCase } from "./dismiss-statement-import-candidate.use-case";
import type { IStatementImportCandidateRepository } from "../../domain/statement-import-candidate.repository.interface";
import {
  StatementImportCandidateEntity,
  type StatementImportCandidateEntityProps,
} from "../../domain/statement-import-candidate.entity";
import { StatementImportCandidateNotFoundException } from "../../domain/exceptions/statement-import-candidate-not-found.exception";
import { StatementImportCandidateNotPendingException } from "../../domain/exceptions/statement-import-candidate-not-pending.exception";

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
    findById: jest.fn().mockResolvedValue(candidate()),
    listByJob: jest.fn(),
    markConfirmed: jest.fn(),
    markDismissed: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<IStatementImportCandidateRepository>;

  const useCase = new DismissStatementImportCandidateUseCase(candidateRepo);
  return { useCase, candidateRepo };
}

describe("DismissStatementImportCandidateUseCase", () => {
  it("candidato inexistente → StatementImportCandidateNotFoundException", async () => {
    const { useCase, candidateRepo } = make();
    candidateRepo.findById.mockResolvedValue(null);

    await expect(useCase.execute("cand_1", "hh_1")).rejects.toBeInstanceOf(
      StatementImportCandidateNotFoundException,
    );
  });

  it("candidato já confirmado/dismissed → StatementImportCandidateNotPendingException", async () => {
    const { useCase, candidateRepo } = make();
    candidateRepo.findById.mockResolvedValue(candidate({ status: "dismissed" }));

    await expect(useCase.execute("cand_1", "hh_1")).rejects.toBeInstanceOf(
      StatementImportCandidateNotPendingException,
    );
  });

  it("candidato pending_review → markDismissed chamado", async () => {
    const { useCase, candidateRepo } = make();

    await useCase.execute("cand_1", "hh_1");

    expect(candidateRepo.markDismissed).toHaveBeenCalledWith("cand_1", "hh_1");
  });
});
