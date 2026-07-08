import { advanceRecurrenceDate, nextRunOnOrAfter } from "./recurrence-schedule";

describe("advanceRecurrenceDate", () => {
  it("weekly avança 7×interval dias", () => {
    expect(advanceRecurrenceDate("2026-07-08", "weekly", 1)).toBe("2026-07-15");
    expect(advanceRecurrenceDate("2026-07-08", "weekly", 2)).toBe("2026-07-22"); // quinzenal
  });

  it("monthly avança interval meses clampando o dia", () => {
    expect(advanceRecurrenceDate("2026-01-15", "monthly", 1)).toBe("2026-02-15");
    expect(advanceRecurrenceDate("2026-01-31", "monthly", 1)).toBe("2026-02-28"); // clamp
    expect(advanceRecurrenceDate("2026-01-15", "monthly", 3)).toBe("2026-04-15"); // trimestral
  });

  it("yearly avança 12×interval meses (vira o ano)", () => {
    expect(advanceRecurrenceDate("2026-07-08", "yearly", 1)).toBe("2027-07-08");
  });

  it("weekly cruza a virada de mês/ano", () => {
    expect(advanceRecurrenceDate("2026-12-29", "weekly", 1)).toBe("2027-01-05");
  });
});

describe("nextRunOnOrAfter (re-âncora na reativação)", () => {
  it("mantém o cursor quando já está em/depois de hoje", () => {
    expect(nextRunOnOrAfter("2026-07-10", "2026-07-08", "monthly", 1)).toBe("2026-07-10");
  });

  it("avança até a 1ª ocorrência >= hoje, pulando as pausadas", () => {
    // cursor 3 meses atrás, mensal → salta para a ocorrência corrente/futura.
    expect(nextRunOnOrAfter("2026-04-10", "2026-07-08", "monthly", 1)).toBe("2026-07-10");
  });

  it("aterra exatamente em hoje quando coincide", () => {
    expect(nextRunOnOrAfter("2026-06-08", "2026-07-08", "monthly", 1)).toBe("2026-07-08");
  });
});
