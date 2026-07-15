import { addDaysISO, addMonthsISO, daysBetween, nextManualOccurrence, toISODate } from "./due-date";

describe("addMonthsISO", () => {
  it("clampa o dia ao fim do mês destino", () => {
    expect(addMonthsISO("2026-01-31", 1)).toBe("2026-02-28");
  });

  it("vira o ano quando soma passa de dezembro", () => {
    expect(addMonthsISO("2026-11-15", 3)).toBe("2027-02-15");
  });
});

describe("addDaysISO", () => {
  it("cruza a virada de mês/ano", () => {
    expect(addDaysISO("2026-12-29", 7)).toBe("2027-01-05");
  });
});

describe("daysBetween", () => {
  it("conta dias-calendário ignorando hora", () => {
    expect(daysBetween(new Date(2026, 6, 5, 23, 0), new Date(2026, 6, 10, 1, 0))).toBe(5);
  });
});

describe("nextManualOccurrence (stateless — modo manual)", () => {
  describe("monthly", () => {
    it("usa o dia no mês corrente quando ainda não passou", () => {
      expect(nextManualOccurrence("2025-01-10", new Date(2026, 6, 5), "monthly", 1)).toEqual(
        new Date(2026, 6, 10),
      );
    });

    it("vai para o mês seguinte quando o dia já passou", () => {
      expect(nextManualOccurrence("2025-01-02", new Date(2026, 6, 20), "monthly", 1)).toEqual(
        new Date(2026, 7, 2),
      );
    });

    it("clampa dia-de-origem 31 ao último dia de mês curto", () => {
      expect(nextManualOccurrence("2025-01-31", new Date(2026, 3, 27), "monthly", 1)).toEqual(
        new Date(2026, 3, 30),
      );
    });

    it("considera o próprio dia como vencimento (hoje)", () => {
      expect(nextManualOccurrence("2025-01-05", new Date(2026, 6, 5), "monthly", 1)).toEqual(
        new Date(2026, 6, 5),
      );
    });

    it("NÃO gruda no clamp: mês seguinte volta a usar o dia-de-origem 31 (sem drift)", () => {
      // Se fosse cursor-based (iterando a partir do resultado anterior), 31/jan
      // clamparia para 28/fev e o próximo passo avançaria de 28 (→ 28/mar), não
      // de volta a 31. Aqui cada mês-alvo clampa 31 do zero a partir de startDate.
      expect(nextManualOccurrence("2026-01-31", new Date(2026, 1, 1), "monthly", 1)).toEqual(
        new Date(2026, 1, 28), // fev clampado
      );
      expect(nextManualOccurrence("2026-01-31", new Date(2026, 2, 1), "monthly", 1)).toEqual(
        new Date(2026, 2, 31), // mar volta a 31, não fica em 28
      );
    });

    it("respeita interval (trimestral)", () => {
      expect(nextManualOccurrence("2026-01-15", new Date(2026, 3, 1), "monthly", 3)).toEqual(
        new Date(2026, 3, 15),
      );
    });
  });

  describe("weekly", () => {
    it("mantém a data quando coincide exatamente", () => {
      expect(nextManualOccurrence("2026-07-08", new Date(2026, 6, 8), "weekly", 2)).toEqual(
        new Date(2026, 6, 8),
      );
    });

    it("avança para a próxima ocorrência quinzenal", () => {
      expect(nextManualOccurrence("2026-07-08", new Date(2026, 6, 10), "weekly", 2)).toEqual(
        new Date(2026, 6, 22),
      );
    });
  });

  describe("yearly", () => {
    it("avança para o próximo aniversário anual", () => {
      expect(nextManualOccurrence("2020-07-08", new Date(2026, 0, 1), "yearly", 1)).toEqual(
        new Date(2026, 6, 8),
      );
    });
  });
});

describe("toISODate", () => {
  it("formata yyyy-MM-dd a partir de data local", () => {
    expect(toISODate(new Date(2026, 6, 8))).toBe("2026-07-08");
  });
});
