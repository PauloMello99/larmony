import { ConfigService } from "@nestjs/config";
import { CreateStatementImportJobUseCase } from "./create-statement-import-job.use-case";
import type { IStatementImportContextRepository } from "../../domain/statement-import-context.repository.interface";
import type { IStatementImportJobRepository } from "../../domain/statement-import-job.repository.interface";
import type { IStatementProcessor } from "../../domain/ports/statement-processor.port";
import { StatementImportJobEntity, type StatementImportJobEntityProps } from "../../domain/statement-import-job.entity";
import { StatementImportDisabledException } from "../../domain/exceptions/statement-import-disabled.exception";

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
  const contextRepo = {
    findCategories: jest.fn().mockResolvedValue([
      { id: "cat_ali", name: "Alimentação", type: "expense", isDefault: true },
      { id: "cat_custom", name: "Pet", type: "expense", isDefault: false },
    ]),
    findMerchantMemory: jest.fn().mockResolvedValue([
      { merchantKey: "DELTA SUPERMERCADOS", categoryId: "cat_ali" },
      { merchantKey: "PETSHOP FIEL", categoryId: "cat_custom" },
    ]),
    findHouseholdMembers: jest.fn().mockResolvedValue([{ userId: "user_1", name: "Helena" }]),
  } as unknown as jest.Mocked<IStatementImportContextRepository>;

  const jobRepo = {
    create: jest.fn().mockResolvedValue(job()),
    findById: jest.fn(),
    markFailedSync: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<IStatementImportJobRepository>;

  const processor = {
    submitJob: jest.fn().mockResolvedValue({ accepted: true }),
  } as unknown as jest.Mocked<IStatementProcessor>;

  const config = {
    get: jest.fn().mockReturnValue("true"),
  } as unknown as jest.Mocked<ConfigService>;

  const useCase = new CreateStatementImportJobUseCase(contextRepo, jobRepo, processor, config);
  return { useCase, contextRepo, jobRepo, processor, config };
}

describe("CreateStatementImportJobUseCase", () => {
  it("flag desabilitada → lança StatementImportDisabledException antes de tocar em qualquer repo", async () => {
    const { useCase, contextRepo, jobRepo, config } = make();
    config.get.mockReturnValue("false");

    await expect(
      useCase.execute({ householdId: "hh_1", userId: "user_1", source: "csv", fileBase64: "AAA" }),
    ).rejects.toBeInstanceOf(StatementImportDisabledException);

    expect(contextRepo.findCategories).not.toHaveBeenCalled();
    expect(jobRepo.create).not.toHaveBeenCalled();
  });

  it("categoria default recebe code correto; categoria custom não recebe code", async () => {
    const { useCase, processor } = make();

    await useCase.execute({ householdId: "hh_1", userId: "user_1", source: "csv", fileBase64: "AAA" });

    const [[{ context }]] = processor.submitJob.mock.calls;
    expect(context.categories).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "cat_ali", code: "ALI" }),
        expect.objectContaining({ id: "cat_custom" }),
      ]),
    );
    const custom = context.categories.find((c) => c.id === "cat_custom");
    expect(custom?.code).toBeUndefined();
  });

  it("merchantMemory de categoria default vira categoryCode; de categoria custom é omitida", async () => {
    const { useCase, processor } = make();

    await useCase.execute({ householdId: "hh_1", userId: "user_1", source: "csv", fileBase64: "AAA" });

    const [[{ context }]] = processor.submitJob.mock.calls;
    expect(context.merchantMemory).toEqual([
      { merchantKey: "DELTA SUPERMERCADOS", categoryCode: "ALI" },
    ]);
  });

  it("processor aceita → job retorna status pending", async () => {
    const { useCase } = make();

    const result = await useCase.execute({
      householdId: "hh_1",
      userId: "user_1",
      source: "csv",
      fileBase64: "AAA",
    });

    expect(result.status).toBe("pending");
  });

  it("processor rejeita → markFailedSync chamado e função retorna job com status failed (não lança)", async () => {
    const { useCase, jobRepo, processor } = make();
    processor.submitJob.mockResolvedValue({
      accepted: false,
      errorCode: "INVALID_FILE",
      errorMessage: "Arquivo corrompido.",
    });

    const result = await useCase.execute({
      householdId: "hh_1",
      userId: "user_1",
      source: "csv",
      fileBase64: "AAA",
    });

    expect(jobRepo.markFailedSync).toHaveBeenCalledWith(
      "job_1",
      "hh_1",
      "INVALID_FILE",
      "Arquivo corrompido.",
    );
    expect(result.status).toBe("failed");
    expect(result.errorCode).toBe("INVALID_FILE");
    expect(result.errorMessage).toBe("Arquivo corrompido.");
  });
});
