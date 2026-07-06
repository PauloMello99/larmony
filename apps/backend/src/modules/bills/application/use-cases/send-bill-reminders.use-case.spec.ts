import { ConfigService } from "@nestjs/config";
import { NotificationService } from "../../../notifications/application/notification.service";
import { BillEntity, BillEntityProps } from "../../domain/bill.entity";
import type { IBillRepository } from "../../domain/bill.repository.interface";
import {
  SendBillRemindersUseCase,
  alreadySentThisMonth,
  nextDueDate,
} from "./send-bill-reminders.use-case";

function bill(partial: Partial<BillEntityProps>): BillEntity {
  return BillEntity.create({
    id: "bill-1",
    householdId: "hh-1",
    householdSlug: "casa-teste",
    name: "Aluguel",
    amountCents: 150_000,
    dueDay: 10,
    isActive: true,
    reminderDaysBefore: 3,
    reminderLastSentAt: null,
    ...partial,
  });
}

function makeUseCase(bills: BillEntity[]) {
  const repo: jest.Mocked<IBillRepository> = {
    findActiveWithReminder: jest.fn().mockResolvedValue(bills),
    markReminderSent: jest.fn().mockResolvedValue(undefined),
    findHouseholdMemberUserIds: jest.fn().mockResolvedValue(["user-a", "user-b"]),
  };
  const notifications = { notify: jest.fn().mockResolvedValue({}) };
  const config = { get: jest.fn().mockReturnValue("http://localhost:3000") };
  const useCase = new SendBillRemindersUseCase(
    repo,
    notifications as unknown as NotificationService,
    config as unknown as ConfigService,
  );
  return { useCase, repo, notifications };
}

describe("nextDueDate", () => {
  it("usa o dia no mês corrente quando ainda não passou", () => {
    expect(nextDueDate(10, new Date(2026, 6, 5))).toEqual(new Date(2026, 6, 10));
  });

  it("vai para o mês seguinte quando o dia já passou", () => {
    expect(nextDueDate(2, new Date(2026, 6, 20))).toEqual(new Date(2026, 7, 2));
  });

  it("clampa dueDay 31 ao último dia de mês curto", () => {
    // Abril tem 30 dias.
    expect(nextDueDate(31, new Date(2026, 3, 27))).toEqual(new Date(2026, 3, 30));
  });

  it("considera o próprio dia como vencimento (hoje)", () => {
    expect(nextDueDate(5, new Date(2026, 6, 5))).toEqual(new Date(2026, 6, 5));
  });
});

describe("alreadySentThisMonth (dedup bill×mês)", () => {
  it("false sem envio anterior", () => {
    expect(alreadySentThisMonth(bill({}), new Date(2026, 6, 7))).toBe(false);
  });

  it("true quando o último envio é do mesmo mês-calendário", () => {
    const b = bill({ reminderLastSentAt: new Date(2026, 6, 1) });
    expect(alreadySentThisMonth(b, new Date(2026, 6, 7))).toBe(true);
  });

  it("false quando o último envio foi em outro mês", () => {
    const b = bill({ reminderLastSentAt: new Date(2026, 5, 7) });
    expect(alreadySentThisMonth(b, new Date(2026, 6, 7))).toBe(false);
  });
});

describe("SendBillRemindersUseCase", () => {
  // now = 2026-07-07; dueDay 10 + reminder 3 → dispara exatamente hoje.
  const now = new Date(2026, 6, 7);

  it("dispara na janela exata e notifica todos os membros", async () => {
    const { useCase, repo, notifications } = makeUseCase([bill({})]);

    const result = await useCase.execute(now);

    expect(result).toEqual({ scanned: 1, sent: 1, skippedDedup: 0 });
    expect(repo.markReminderSent).toHaveBeenCalledWith("bill-1", now);
    expect(notifications.notify).toHaveBeenCalledTimes(2); // user-a + user-b
    expect(notifications.notify).toHaveBeenCalledWith(
      expect.objectContaining({ type: "bill_reminder", householdId: "hh-1" }),
    );
    // Guarda gravada ANTES do envio — e-mail best-effort nunca duplica.
    const markOrder = repo.markReminderSent.mock.invocationCallOrder[0]!;
    const notifyOrder = notifications.notify.mock.invocationCallOrder[0]!;
    expect(markOrder).toBeLessThan(notifyOrder);
  });

  it("não dispara fora da janela", async () => {
    const { useCase, repo, notifications } = makeUseCase([bill({ dueDay: 15 })]);

    const result = await useCase.execute(now); // faltam 8 dias ≠ 3

    expect(result).toEqual({ scanned: 1, sent: 0, skippedDedup: 0 });
    expect(repo.markReminderSent).not.toHaveBeenCalled();
    expect(notifications.notify).not.toHaveBeenCalled();
  });

  it("dedup: pula bill já lembrada neste mês (tick repetido não re-envia)", async () => {
    const { useCase, repo, notifications } = makeUseCase([
      bill({ reminderLastSentAt: new Date(2026, 6, 7, 9, 0) }),
    ]);

    const result = await useCase.execute(now);

    expect(result).toEqual({ scanned: 1, sent: 0, skippedDedup: 1 });
    expect(repo.markReminderSent).not.toHaveBeenCalled();
    expect(notifications.notify).not.toHaveBeenCalled();
  });

  it("clamp de mês curto: dueDay 31 em abril dispara no dia 27 com reminder 3", async () => {
    const { useCase } = makeUseCase([bill({ dueDay: 31 })]);

    const result = await useCase.execute(new Date(2026, 3, 27)); // due 30/04

    expect(result.sent).toBe(1);
  });

  it("vencimento já passado no mês → janela calculada para o mês seguinte", async () => {
    const { useCase } = makeUseCase([bill({ dueDay: 2, reminderDaysBefore: 15 })]);

    // 18/07 → próximo vencimento 02/08, faltam 15 dias → dispara.
    const result = await useCase.execute(new Date(2026, 6, 18));

    expect(result.sent).toBe(1);
  });
});
