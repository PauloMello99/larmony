import type { DispatchNotificationUseCase } from "../../../notifications/application/use-cases/dispatch-notification.use-case";
import type { NotificationDedupService } from "../../../notifications/application/notification-dedup.service";
import type {
  ActiveHousehold,
  IReportRepository,
  MonthlyReport,
} from "../../domain/report.repository.interface";
import { SendMonthlyReportUseCase } from "./send-monthly-report.use-case";

const KIRITIMATI = "Pacific/Kiritimati"; // UTC+14
const MIDWAY = "Pacific/Midway"; // UTC-11

function report(month: number, year: number): MonthlyReport {
  return {
    months: [{ year, month, incomeCents: 1000, expenseCents: 400 }],
    byCategory: [],
    byPerson: [],
    refMonth: { month, year },
  };
}

function makeUseCase(households: ActiveHousehold[], claim = true) {
  const reports: jest.Mocked<IReportRepository> = {
    getMonthlyReport: jest.fn(),
    getAnnualReport: jest.fn(),
    findAllActiveHouseholds: jest.fn().mockResolvedValue(households),
    getMonthlyReportAdmin: jest
      .fn()
      .mockImplementation((_id: string, now: Date) =>
        Promise.resolve(report(now.getMonth() + 1, now.getFullYear())),
      ),
    findHouseholdMemberUserIds: jest.fn().mockResolvedValue(["u1"]),
  };
  const dispatch = { execute: jest.fn().mockResolvedValue(undefined) };
  const dedup = { claim: jest.fn().mockResolvedValue(claim) };
  const useCase = new SendMonthlyReportUseCase(
    reports,
    dispatch as unknown as DispatchNotificationUseCase,
    dedup as unknown as NotificationDedupService,
  );
  return { useCase, reports, dispatch, dedup };
}

describe("SendMonthlyReportUseCase (fuso do lar, M12)", () => {
  // 31/jan 00:00 UTC: em Kiritimati (+14) já é 31/jan (último dia); em Midway
  // (−11) ainda é 30/jan (não é o último dia).
  const now = new Date("2026-01-31T00:00:00Z");

  it("dispara só nos lares onde é o último dia do mês LOCAL", async () => {
    const { useCase, dispatch } = makeUseCase([
      { id: "kiri", timezone: KIRITIMATI, notificationHour: 0 },
      { id: "mid", timezone: MIDWAY, notificationHour: 0 },
    ]);

    const result = await useCase.execute(now);

    expect(result.sent).toBe(1);
    expect(dispatch.execute).toHaveBeenCalledTimes(1);
    expect(dispatch.execute).toHaveBeenCalledWith(
      expect.objectContaining({ householdId: "kiri", type: "monthly_report" }),
    );
  });

  it("respeita a hora preferida local do lar (antes da hora → não dispara)", async () => {
    // Em Kiritimati são ~14h; hora preferida 20 → ainda não.
    const { useCase, dispatch } = makeUseCase([
      { id: "kiri", timezone: KIRITIMATI, notificationHour: 20 },
    ]);

    const result = await useCase.execute(now);

    expect(result.sent).toBe(0);
    expect(dispatch.execute).not.toHaveBeenCalled();
  });

  it("dedup já reivindicado (mês) → não redispara", async () => {
    const { useCase, dispatch } = makeUseCase(
      [{ id: "kiri", timezone: KIRITIMATI, notificationHour: 0 }],
      /* claim */ false,
    );

    const result = await useCase.execute(now);

    expect(result.sent).toBe(0);
    expect(dispatch.execute).not.toHaveBeenCalled();
  });

  it("dedup key e refMonth usam o mês LOCAL do lar", async () => {
    const { useCase, dedup, dispatch } = makeUseCase([
      { id: "kiri", timezone: KIRITIMATI, notificationHour: 0 },
    ]);

    await useCase.execute(now);

    // Mês local de Kiritimati em 31/jan = "2026-01".
    expect(dedup.claim).toHaveBeenCalledWith("kiri", "monthly_report", "kiri", "2026-01");
    expect(dispatch.execute).toHaveBeenCalledWith(
      expect.objectContaining({ month: 1, year: 2026 }),
    );
  });
});
