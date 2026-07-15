import { localHour, localISODate, zonedNow } from "./tz-clock";

const KIRITIMATI = "Pacific/Kiritimati"; // UTC+14 (maior offset do mundo)
const MIDWAY = "Pacific/Midway"; // UTC-11
const SAO_PAULO = "America/Sao_Paulo"; // UTC-3, sem DST desde 2019
const BERLIN = "Europe/Berlin"; // UTC+1 (inverno) / +2 (verão) — testa DST

describe("tz-clock", () => {
  // 00:30 UTC de 15/jan: a data-calendário local diverge entre fusos.
  const nearUtcMidnight = new Date("2026-01-15T00:30:00Z");

  describe("localISODate", () => {
    it("resolve a data-calendário local de cada fuso no mesmo instante", () => {
      // UTC+14 já virou o dia; UTC-11 e UTC-3 ainda estão no dia anterior.
      expect(localISODate(KIRITIMATI, nearUtcMidnight)).toBe("2026-01-15");
      expect(localISODate(MIDWAY, nearUtcMidnight)).toBe("2026-01-14");
      expect(localISODate(SAO_PAULO, nearUtcMidnight)).toBe("2026-01-14");
    });
  });

  describe("localHour", () => {
    it("resolve a hora local (0–23) de cada fuso", () => {
      expect(localHour(KIRITIMATI, nearUtcMidnight)).toBe(14); // 00:30 + 14
      expect(localHour(MIDWAY, nearUtcMidnight)).toBe(13); // 00:30 - 11 = 13:30 (dia anterior)
      expect(localHour(SAO_PAULO, nearUtcMidnight)).toBe(21); // 00:30 - 3 = 21:30 (dia anterior)
    });

    it("é consciente de DST — mesmo horário UTC, offset diferente por estação", () => {
      // Berlim: inverno UTC+1, verão UTC+2 (a lib resolve pelo IANA).
      expect(localHour(BERLIN, new Date("2026-01-01T00:30:00Z"))).toBe(1);
      expect(localHour(BERLIN, new Date("2026-07-01T00:30:00Z"))).toBe(2);
    });
  });

  describe("zonedNow", () => {
    it("devolve um Date cujos getters locais refletem o fuso alvo", () => {
      const z = zonedNow(SAO_PAULO, nearUtcMidnight);
      expect(z.getFullYear()).toBe(2026);
      expect(z.getMonth()).toBe(0); // janeiro
      expect(z.getDate()).toBe(14); // ainda dia 14 em São Paulo
      expect(z.getHours()).toBe(21);
    });
  });
});
