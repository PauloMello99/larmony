import {
  ProcessStatementImportCallbackUseCase,
  type ProcessStatementImportCallbackInput,
} from "./process-statement-import-callback.use-case";
import type { IStatementImportAdminRepository } from "../../domain/statement-import-admin.repository.interface";
import type { DispatchNotificationUseCase } from "../../../notifications/application/use-cases/dispatch-notification.use-case";
import { StatementImportJobEntity, type StatementImportJobEntityProps } from "../../domain/statement-import-job.entity";

function job(overrides: Partial<StatementImportJobEntityProps> = {}) {
  return StatementImportJobEntity.create({
    id: "job_1",
    householdId: "hh_1",
    createdBy: "user_1",
    source: "csv",
    status: "processing",
    errorCode: null,
    errorMessage: null,
    stats: null,
    createdAt: new Date("2026-08-22T10:00:00Z"),
    completedAt: null,
    ...overrides,
  });
}

function make() {
  const adminRepo = {
    findCategories: jest.fn().mockResolvedValue([
      { id: "cat_ali", name: "Alimentação", isDefault: true },
      { id: "cat_custom", name: "Pet", isDefault: false },
    ]),
    findJobById: jest.fn().mockResolvedValue(job()),
    completeJob: jest.fn().mockResolvedValue({ ok: true, job: job({ status: "failed" }) }),
    completeJobWithCandidates: jest.fn().mockResolvedValue({
      ok: true,
      job: job({ status: "completed" }),
      insertedCount: 1,
      skippedCount: 0,
    }),
    insertCandidates: jest.fn().mockResolvedValue({ insertedCount: 1, skippedCount: 0 }),
    sweepTimeouts: jest.fn(),
  } as unknown as jest.Mocked<IStatementImportAdminRepository>;

  const dispatchNotification = {
    execute: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<DispatchNotificationUseCase>;

  const useCase = new ProcessStatementImportCallbackUseCase(adminRepo, dispatchNotification);
  return { useCase, adminRepo, dispatchNotification };
}

const completedInput: ProcessStatementImportCallbackInput = {
  jobId: "job_1",
  status: "completed",
  transactions: [
    {
      externalId: "ext_1",
      date: "2026-07-19",
      amountCents: 195000,
      type: "expense",
      description: "Mercado Delta",
      categoryCode: "ALI",
      categoryConfidence: "high",
      resolvedBy: "merchant_memory",
      merchantKey: "DELTA SUPERMERCADOS",
    },
  ],
  stats: { total: 94, resolvedByRules: 72, resolvedByLlm: 8, unresolved: 14, processingMs: 1830 },
};

describe("ProcessStatementImportCallbackUseCase", () => {
  it("jobId desconhecido → no-op (nenhum outro repo/notification chamado)", async () => {
    const { useCase, adminRepo, dispatchNotification } = make();
    adminRepo.findJobById.mockResolvedValue(null);

    await useCase.execute(completedInput);

    expect(adminRepo.completeJob).not.toHaveBeenCalled();
    expect(adminRepo.completeJobWithCandidates).not.toHaveBeenCalled();
    expect(dispatchNotification.execute).not.toHaveBeenCalled();
  });

  it("callback duplicado (completeJobWithCandidates ok:false) → no-op", async () => {
    const { useCase, adminRepo, dispatchNotification } = make();
    adminRepo.completeJobWithCandidates.mockResolvedValue({
      ok: false,
      job: null,
      insertedCount: 0,
      skippedCount: 0,
    });

    await useCase.execute(completedInput);

    expect(dispatchNotification.execute).not.toHaveBeenCalled();
  });

  it("sucesso resolve categoryId pra categoryCode de categoria default existente, gravando job+candidatos atomicamente", async () => {
    const { useCase, adminRepo } = make();

    await useCase.execute(completedInput);

    expect(adminRepo.completeJobWithCandidates).toHaveBeenCalledWith(
      "job_1",
      expect.objectContaining({ status: "completed" }),
      "hh_1",
      expect.arrayContaining([expect.objectContaining({ categoryId: "cat_ali" })]),
    );
  });

  it("categoryCode de categoria renomeada/removida → categoryId:null", async () => {
    const { useCase, adminRepo } = make();
    adminRepo.findCategories.mockResolvedValue([]);

    await useCase.execute(completedInput);

    expect(adminRepo.completeJobWithCandidates).toHaveBeenCalledWith(
      "job_1",
      expect.anything(),
      "hh_1",
      expect.arrayContaining([expect.objectContaining({ categoryId: null })]),
    );
  });

  it("categoryCode null direto → categoryId:null sem tentar resolver", async () => {
    const { useCase, adminRepo } = make();
    const input: ProcessStatementImportCallbackInput = {
      ...completedInput,
      transactions: [{ ...completedInput.transactions[0]!, categoryCode: null }],
    };

    await useCase.execute(input);

    expect(adminRepo.completeJobWithCandidates).toHaveBeenCalledWith(
      "job_1",
      expect.anything(),
      "hh_1",
      expect.arrayContaining([expect.objectContaining({ categoryId: null })]),
    );
  });

  it("falha dispara notification statement_import_failed com o errorCode certo", async () => {
    const { useCase, adminRepo, dispatchNotification } = make();
    adminRepo.completeJob.mockResolvedValue({ ok: true, job: job({ status: "failed" }) });
    const input: ProcessStatementImportCallbackInput = {
      jobId: "job_1",
      status: "failed",
      errorCode: "TIMEOUT",
      errorMessage: "O processor não respondeu.",
    };

    await useCase.execute(input);

    expect(dispatchNotification.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "statement_import_failed",
        errorCode: "TIMEOUT",
        recipientUserIds: ["user_1"],
        householdId: "hh_1",
      }),
    );
  });

  it("amountCents negativo ou zero → rejeita o job (failed/INTERNAL_ERROR), nunca coage com Math.abs()", async () => {
    const { useCase, adminRepo, dispatchNotification } = make();
    const input: ProcessStatementImportCallbackInput = {
      ...completedInput,
      transactions: [{ ...completedInput.transactions[0]!, amountCents: -8990 }],
    };

    await useCase.execute(input);

    expect(adminRepo.completeJob).toHaveBeenCalledWith(
      "job_1",
      expect.objectContaining({ status: "failed", errorCode: "INTERNAL_ERROR" }),
    );
    expect(adminRepo.completeJobWithCandidates).not.toHaveBeenCalled();
    expect(dispatchNotification.execute).toHaveBeenCalledWith(
      expect.objectContaining({ type: "statement_import_failed", errorCode: "INTERNAL_ERROR" }),
    );
  });

  it("sucesso dispara statement_import_completed com as contagens certas", async () => {
    const { useCase, dispatchNotification } = make();

    await useCase.execute(completedInput);

    expect(dispatchNotification.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "statement_import_completed",
        total: 94,
        resolvedCount: 80,
        unresolvedCount: 14,
        recipientUserIds: ["user_1"],
        householdId: "hh_1",
      }),
    );
  });
});
