import { formatInTimeZone, toZonedTime } from "date-fns-tz";

/**
 * Relógio consciente de timezone (M12, ADR-0024). Ponto ÚNICO de injeção do
 * fuso: onde antes um job/âncora usava `new Date()` cru (relógio do processo,
 * UTC em produção), passa a usar estes helpers com o fuso IANA do lar
 * (`households.timezone`) — nunca offset fixo (DST é resolvido pela lib).
 *
 * Gotcha que estes helpers blindam: o driver `pg` devolve colunas `date` como
 * `Date` JS à meia-noite UTC; comparar com `getDate()`/`toISOString().slice()`
 * ingênuos mistura fusos. Aqui a conversão é sempre explícita pelo `timeZone`.
 */

/**
 * Instante `now` reexpresso no fuso `timezone`: o `Date` retornado responde aos
 * getters LOCAIS (`getFullYear/getMonth/getDate/getHours`) já no fuso alvo.
 * Use para alimentar helpers que leem componentes locais (ex.: `monthBounds`,
 * `nextManualOccurrence`, `alreadySentToday`).
 */
export function zonedNow(timezone: string, now: Date = new Date()): Date {
  return toZonedTime(now, timezone);
}

/**
 * Data-calendário (yyyy-MM-dd) no fuso `timezone` para o instante `now` —
 * o "hoje local" do lar, no mesmo formato das colunas `date` do Postgres.
 */
export function localISODate(timezone: string, now: Date = new Date()): string {
  return formatInTimeZone(now, timezone, "yyyy-MM-dd");
}

/** Hora local (0–23) no fuso `timezone` para o instante `now`. */
export function localHour(timezone: string, now: Date = new Date()): number {
  return Number(formatInTimeZone(now, timezone, "H"));
}
