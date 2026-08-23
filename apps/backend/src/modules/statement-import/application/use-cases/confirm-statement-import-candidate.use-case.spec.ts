import { ConfirmStatementImportCandidateUseCase } from "./confirm-statement-import-candidate.use-case";
import type { IStatementImportCandidateRepository } from "../../domain/statement-import-candidate.repository.interface";
import type { IMerchantCategoryMemoryRepository } from "../../domain/merchant-category-memory.repository.interface";
import type { CreateTransactionUseCase } from "../../../transactions/application/use-cases/create-transaction.use-case";
import {
  StatementImportCandidateEntity,
  type StatementImportCandidateEntityProps,
} from "../../domain/statement-import-candidate.entity";
import { TransactionEntity, type TransactionEntityProps } from "../../../transactions/domain/transaction.entity";
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

function transaction(overrides: Partial<TransactionEntityProps> = {}) {
  return TransactionEntity.create({
    id: "txn_1",
    householdId: "hh_1",
    createdBy: "user_1",
    personId: "user_1",
    categoryId: "cat_ali",
    type: "expense",
    amountCents: 195000,
    description: "Mercado Delta",
    date: "2026-07-19",
    notes: null,
    installmentGroupId: null,
    installmentNumber: null,
    installmentCount: null,
    scheduledTransactionEntryId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });
}

function make() {
  const candidateRepo = {
    findById: jest.fn().mockResolvedValue(candidate()),
    listByJob: jest.fn(),
    markConfirmed: jest.fn().mockResolvedValue(undefined),
    markDismissed: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<IStatementImportCandidateRepository>;

  const memoryRepo = {
    upsert: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<IMerchantCategoryMemoryRepository>;

  const createTransaction = {
    execute: jest.fn().mockResolvedValue(transaction()),
  } as unknown as jest.Mocked<CreateTransactionUseCase>;

  const useCase = new ConfirmStatementImportCandidateUseCase(candidateRepo, memoryRepo, createTransaction);
  return { useCase, candidateRepo, memoryRepo, createTransaction };
}

describe("ConfirmStatementImportCandidateUseCase", () => {
  it("candidato inexistente → StatementImportCandidateNotFoundException", async () => {
    const { useCase, candidateRepo } = make();
    candidateRepo.findById.mockResolvedValue(null);

    await expect(useCase.execute("cand_1", "hh_1", "auth_1", "user_1", {})).rejects.toBeInstanceOf(
      StatementImportCandidateNotFoundException,
    );
  });

  it("candidato já confirmado/dismissed → StatementImportCandidateNotPendingException", async () => {
    const { useCase, candidateRepo } = make();
    candidateRepo.findById.mockResolvedValue(candidate({ status: "confirmed" }));

    await expect(useCase.execute("cand_1", "hh_1", "auth_1", "user_1", {})).rejects.toBeInstanceOf(
      StatementImportCandidateNotPendingException,
    );
  });

  it("confirma sem mudar a categoria sugerida → memoryRepo.upsert nunca chamado", async () => {
    const { useCase, candidateRepo, memoryRepo } = make();
    candidateRepo.findById.mockResolvedValue(candidate({ categoryId: "cat_ali" }));

    await useCase.execute("cand_1", "hh_1", "auth_1", "user_1", { categoryId: "cat_ali" });

    expect(memoryRepo.upsert).not.toHaveBeenCalled();
  });

  it("confirma corrigindo null→categoria → upsert chamado com a categoria nova", async () => {
    const { useCase, candidateRepo, memoryRepo } = make();
    candidateRepo.findById.mockResolvedValue(candidate({ categoryId: null }));

    await useCase.execute("cand_1", "hh_1", "auth_1", "user_1", { categoryId: "cat_ali" });

    expect(memoryRepo.upsert).toHaveBeenCalledWith("hh_1", "DELTA SUPERMERCADOS", "cat_ali");
  });

  it("confirma trocando sugestão A por B → upsert chamado com B", async () => {
    const { useCase, candidateRepo, memoryRepo } = make();
    candidateRepo.findById.mockResolvedValue(candidate({ categoryId: "cat_a" }));

    await useCase.execute("cand_1", "hh_1", "auth_1", "user_1", { categoryId: "cat_b" });

    expect(memoryRepo.upsert).toHaveBeenCalledWith("hh_1", "DELTA SUPERMERCADOS", "cat_b");
  });

  it("createTransactionUseCase.execute sempre chamado com os dados do candidato", async () => {
    const { useCase, candidateRepo, createTransaction } = make();
    candidateRepo.findById.mockResolvedValue(
      candidate({
        type: "expense",
        amountCents: 195000,
        description: "Mercado Delta",
        date: "2026-07-19",
        categoryId: null,
      }),
    );

    await useCase.execute("cand_1", "hh_1", "auth_1", "user_1", { categoryId: "cat_ali" });

    expect(createTransaction.execute).toHaveBeenCalledWith("hh_1", "auth_1", "user_1", {
      type: "expense",
      amountCents: 195000,
      description: "Mercado Delta",
      date: "2026-07-19",
      categoryId: "cat_ali",
    });
  });

  it("marca o candidato como confirmado com o id da transaction criada", async () => {
    const { useCase, candidateRepo, createTransaction } = make();
    createTransaction.execute.mockResolvedValue(transaction({ id: "txn_99" }));

    await useCase.execute("cand_1", "hh_1", "auth_1", "user_1", {});

    expect(candidateRepo.markConfirmed).toHaveBeenCalledWith("cand_1", "hh_1", "txn_99");
  });
});
