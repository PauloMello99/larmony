import { ConfigService } from "@nestjs/config";
import type { DispatchNotificationUseCase } from "../../../notifications/application/use-cases/dispatch-notification.use-case";
import { ScheduledEntryEntity, ScheduledEntryEntityProps } from "../../domain/scheduled-entry.entity";
import type { IScheduledEntryRepository } from "../../domain/scheduled-entry.repository.interface";
import { alreadySentToday, SendScheduledEntryRemindersUseCase } from "./send-scheduled-entry-reminders.use-case";

function entry(partial: Partial<ScheduledEntryEntityProps>): ScheduledEntryEntity {
  return ScheduledEntryEntity.create({
    id: "entry-1",
    householdId: "hh-1",
    householdSlug: "casa-teste",
    description: "Aluguel",
    amountCents: 150_000,
    frequency: "monthly",
    interval: 1,
    startDate: "2025-01-10",
    isActive: true,
    reminderDaysBefore: 3,
    reminderLastSentAt: null,
    ...partial,
  });
}

function makeUseCase(entries: ScheduledEntryEntity[]) {
  const repo: jest.Mocked<IScheduledEntryRepository> = {
    findAllByHousehold: jest.fn(),
    findById: jest.fn(),
    findForLaunch: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    findDue: jest.fn(),
    advanceNextRun: jest.fn(),
    deactivate: jest.fn(),
    findActiveWithReminder: jest.fn().mockResolvedValue(entries),
    markReminderSent: jest.fn().mockResolvedValue(undefined),
    findHouseholdMemberUserIds: jest.fn().mockResolvedValue(["user-a", "user-b"]),
  };
  const dispatch = { execute: jest.fn().mockResolvedValue(undefined) };
  const config = { get: jest.fn().mockReturnValue("http://localhost:3000") };
  const useCase = new SendScheduledEntryRemindersUseCase(
    repo,
    dispatch as unknown as DispatchNotificationUseCase,
    config as unknown as ConfigService,
  );
  return { useCase, repo, dispatch };
}

describe("alreadySentToday (dedup por dia-calendário)", () => {
  it("false sem envio anterior", () => {
    expect(alreadySentToday(entry({}), new Date(2026, 6, 7))).toBe(false);
  });

  it("true quando o último envio é do mesmo dia", () => {
    const e = entry({ reminderLastSentAt: new Date(2026, 6, 7, 9, 0) });
    expect(alreadySentToday(e, new Date(2026, 6, 7, 18, 0))).toBe(true);
  });

  it("false quando o último envio foi em outro dia do mesmo mês", () => {
    const e = entry({ reminderLastSentAt: new Date(2026, 6, 5) });
    expect(alreadySentToday(e, new Date(2026, 6, 7))).toBe(false);
  });
});

describe("SendScheduledEntryRemindersUseCase", () => {
  // now = 2026-07-07; startDate dia 10 + reminder 3 → dispara exatamente hoje.
  const now = new Date(2026, 6, 7);

  it("dispara na janela exata e notifica todos os membros num único dispatch", async () => {
    const { useCase, repo, dispatch } = makeUseCase([entry({})]);

    const result = await useCase.execute(now);

    expect(result).toEqual({ scanned: 1, sent: 1, skippedDedup: 0 });
    expect(repo.markReminderSent).toHaveBeenCalledWith("entry-1", now);
    // Fan-out por destinatário é do dispatcher: 1 chamada com os 2 membros.
    expect(dispatch.execute).toHaveBeenCalledTimes(1);
    expect(dispatch.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "bill_reminder",
        householdId: "hh-1",
        recipientUserIds: ["user-a", "user-b"],
        description: "Aluguel",
      }),
    );
    // Guarda gravada ANTES do envio — e-mail best-effort nunca duplica.
    const markOrder = repo.markReminderSent.mock.invocationCallOrder[0]!;
    const dispatchOrder = dispatch.execute.mock.invocationCallOrder[0]!;
    expect(markOrder).toBeLessThan(dispatchOrder);
  });

  it("não dispara fora da janela", async () => {
    const { useCase, repo, dispatch } = makeUseCase([entry({ startDate: "2025-01-15" })]);

    const result = await useCase.execute(now); // faltam 8 dias ≠ 3

    expect(result).toEqual({ scanned: 1, sent: 0, skippedDedup: 0 });
    expect(repo.markReminderSent).not.toHaveBeenCalled();
    expect(dispatch.execute).not.toHaveBeenCalled();
  });

  it("dedup: pula entrada já lembrada hoje (tick repetido não re-envia)", async () => {
    const { useCase, repo, dispatch } = makeUseCase([
      entry({ reminderLastSentAt: new Date(2026, 6, 7, 9, 0) }),
    ]);

    const result = await useCase.execute(now);

    expect(result).toEqual({ scanned: 1, sent: 0, skippedDedup: 1 });
    expect(repo.markReminderSent).not.toHaveBeenCalled();
    expect(dispatch.execute).not.toHaveBeenCalled();
  });

  it("clamp de mês curto: dia-de-origem 31 em abril dispara no dia 27 com reminder 3", async () => {
    const { useCase } = makeUseCase([entry({ startDate: "2025-01-31" })]);

    const result = await useCase.execute(new Date(2026, 3, 27)); // due 30/04

    expect(result.sent).toBe(1);
  });

  it("vencimento já passado no mês → janela calculada para o mês seguinte", async () => {
    const { useCase } = makeUseCase([entry({ startDate: "2025-01-02", reminderDaysBefore: 15 })]);

    // 18/07 → próximo vencimento 02/08, faltam 15 dias → dispara.
    const result = await useCase.execute(new Date(2026, 6, 18));

    expect(result.sent).toBe(1);
  });

  it("dedup por dia (não por mês): 2ª ocorrência semanal do mesmo mês dispara de novo", async () => {
    // Bug corrigido pelo ADR-0020: dedup por MÊS (herdado de bills) bloquearia
    // esta 2ª ocorrência por já ter enviado um lembrete em julho. Dedup por DIA
    // é o guarda correto para qualquer cadência — permite, pois é outro dia.
    const { useCase, repo } = makeUseCase([
      entry({
        frequency: "weekly",
        interval: 1,
        startDate: "2026-07-01",
        reminderDaysBefore: 3,
        reminderLastSentAt: new Date(2026, 6, 5), // lembrete da ocorrência 08/07
      }),
    ]);

    // 12/07 → próxima ocorrência 15/07, faltam 3 dias → dispara (mesmo mês, outro dia).
    const result = await useCase.execute(new Date(2026, 6, 12));

    expect(result).toEqual({ scanned: 1, sent: 1, skippedDedup: 0 });
    expect(repo.markReminderSent).toHaveBeenCalledWith("entry-1", new Date(2026, 6, 12));
  });
});
