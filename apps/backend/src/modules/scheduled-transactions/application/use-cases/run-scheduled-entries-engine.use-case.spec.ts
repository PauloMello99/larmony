import { RunScheduledEntriesEngineUseCase } from "./run-scheduled-entries-engine.use-case";
import type { CreateGeneratedTransactionUseCase } from "../../../transactions/application/use-cases/create-generated-transaction.use-case";
import type { DispatchNotificationUseCase } from "../../../notifications/application/use-cases/dispatch-notification.use-case";
import type {
  DueScheduledEntry,
  IScheduledEntryRepository,
} from "../../domain/scheduled-entry.repository.interface";

function dueEntry(partial: Partial<DueScheduledEntry>): DueScheduledEntry {
  return {
    id: "e1",
    householdId: "hh1",
    createdBy: "u1",
    personId: "u1",
    categoryId: null,
    type: "expense",
    amountCents: 1000,
    description: "Assinatura",
    frequency: "monthly",
    interval: 1,
    endDate: null,
    nextRunDate: "2026-06-15",
    ...partial,
  };
}

function makeUseCase(due: DueScheduledEntry[]) {
  const repo: jest.Mocked<IScheduledEntryRepository> = {
    findAllByHousehold: jest.fn(),
    findById: jest.fn(),
    findForLaunch: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    findDue: jest.fn().mockResolvedValue(due),
    advanceNextRun: jest.fn().mockResolvedValue(undefined),
    deactivate: jest.fn().mockResolvedValue(undefined),
    findActiveWithReminder: jest.fn(),
    markReminderSent: jest.fn(),
    findHouseholdMemberUserIds: jest.fn().mockResolvedValue([]),
  };
  const createGenerated = { execute: jest.fn().mockResolvedValue({}) };
  const dispatch = { execute: jest.fn().mockResolvedValue(undefined) };
  const useCase = new RunScheduledEntriesEngineUseCase(
    repo,
    createGenerated as unknown as CreateGeneratedTransactionUseCase,
    dispatch as unknown as DispatchNotificationUseCase,
  );
  return { useCase, repo, createGenerated, dispatch };
}

// Datas escolhidas para serem robustas a ±1 dia de fuso na conversão de `now`.
const now = new Date(2026, 6, 8); // 2026-07-08

describe("RunScheduledEntriesEngineUseCase", () => {
  it("gera 1 ocorrência vencida, avançando o cursor ANTES de inserir", async () => {
    const { useCase, repo, createGenerated } = makeUseCase([
      dueEntry({ nextRunDate: "2026-06-15" }),
    ]);

    const result = await useCase.execute(now);

    expect(result).toEqual({ scanned: 1, generated: 1, deactivated: 0 });
    expect(repo.advanceNextRun).toHaveBeenCalledWith("e1", "2026-07-15");
    expect(createGenerated.execute).toHaveBeenCalledWith(
      "hh1",
      expect.objectContaining({
        scheduledTransactionEntryId: "e1",
        date: "2026-06-15",
        type: "expense",
        amountCents: 1000,
        createdBy: "u1",
        personId: "u1",
      }),
    );
    // Cursor persistido ANTES da transação (gaps-over-dups).
    const advanceOrder = repo.advanceNextRun.mock.invocationCallOrder[0]!;
    const insertOrder = createGenerated.execute.mock.invocationCallOrder[0]!;
    expect(advanceOrder).toBeLessThan(insertOrder);
  });

  it("faz catch-up de várias ocorrências perdidas num único tick", async () => {
    const { useCase, repo, createGenerated } = makeUseCase([
      // 05-15, 06-15 vencidas; 07-15 é futuro (> 08/07) → para.
      dueEntry({ nextRunDate: "2026-05-15" }),
    ]);

    const result = await useCase.execute(now);

    expect(result.generated).toBe(2);
    expect(createGenerated.execute).toHaveBeenCalledTimes(2);
    const dates = createGenerated.execute.mock.calls.map((c) => c[1].date);
    expect(dates).toEqual(["2026-05-15", "2026-06-15"]);
    expect(repo.advanceNextRun).toHaveBeenLastCalledWith("e1", "2026-07-15");
  });

  it("encerra a série sem gerar quando o cursor passa do endDate", async () => {
    const { useCase, repo, createGenerated } = makeUseCase([
      dueEntry({ nextRunDate: "2026-06-15", endDate: "2026-05-01" }),
    ]);

    const result = await useCase.execute(now);

    expect(result).toEqual({ scanned: 1, generated: 0, deactivated: 1 });
    expect(repo.deactivate).toHaveBeenCalledWith("e1");
    expect(createGenerated.execute).not.toHaveBeenCalled();
  });

  it("não gera nada quando não há entradas auto vencidas", async () => {
    const { useCase, createGenerated } = makeUseCase([]);
    const result = await useCase.execute(now);
    expect(result).toEqual({ scanned: 0, generated: 0, deactivated: 0 });
    expect(createGenerated.execute).not.toHaveBeenCalled();
  });
});
