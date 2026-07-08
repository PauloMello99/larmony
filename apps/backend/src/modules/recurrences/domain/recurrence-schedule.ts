import { addDaysISO, addMonthsISO } from "../../../common/finance/due-date";
import type { RecurrenceFrequency } from "./recurrence.entity";

/**
 * Avança uma data ISO (yyyy-MM-dd) em 1 período da recorrência:
 *  - weekly  → +7×interval dias
 *  - monthly → +interval meses (dia clampado ao fim do mês — 31/01 +1m → 28/02)
 *  - yearly  → +12×interval meses
 *
 * Comparações de datas usam ordenação lexicográfica de strings yyyy-MM-dd
 * (válida por serem zero-padded), então quem consome não precisa de Date.
 */
export function advanceRecurrenceDate(
  iso: string,
  frequency: RecurrenceFrequency,
  interval: number,
): string {
  switch (frequency) {
    case "weekly":
      return addDaysISO(iso, 7 * interval);
    case "monthly":
      return addMonthsISO(iso, interval);
    case "yearly":
      return addMonthsISO(iso, 12 * interval);
  }
}

/** Guarda de segurança: máx. de ocorrências avançadas por regra num único passo. */
export const MAX_SCHEDULE_STEPS = 240;

/**
 * Primeira ocorrência em ou depois de `today`, avançando a partir de `from`
 * pela cadência da regra. Usado na reativação (isActive false→true) para
 * re-ancorar `nextRunDate` e evitar backfill surpresa das ocorrências pausadas.
 * Se `from` já é >= today, retorna `from`. Bounded por MAX_SCHEDULE_STEPS.
 */
export function nextRunOnOrAfter(
  from: string,
  today: string,
  frequency: RecurrenceFrequency,
  interval: number,
): string {
  let d = from;
  let steps = 0;
  while (d < today && steps < MAX_SCHEDULE_STEPS) {
    d = advanceRecurrenceDate(d, frequency, interval);
    steps++;
  }
  return d;
}
