/** Último dia do mês de `year`/`monthIndex` (monthIndex 0-based). */
export function lastDayOfMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate();
}

/** Data-only (meia-noite local) — comparações de dias sem efeito de horário. */
export function dateOnly(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/**
 * Próximo vencimento de uma conta a partir de `today` (inclusive): dia
 * `dueDay` clampado ao fim do mês; se já passou neste mês, o do mês seguinte.
 */
export function nextDueDate(dueDay: number, today: Date): Date {
  const base = dateOnly(today);
  const clamp = (y: number, m: number) =>
    new Date(y, m, Math.min(dueDay, lastDayOfMonth(y, m)));

  const thisMonth = clamp(base.getFullYear(), base.getMonth());
  if (thisMonth >= base) return thisMonth;
  return clamp(base.getFullYear(), base.getMonth() + 1);
}

export function daysBetween(from: Date, to: Date): number {
  return Math.round((dateOnly(to).getTime() - dateOnly(from).getTime()) / 86_400_000);
}

/** Início (inclusive) e fim (exclusive) do mês-calendário de `ref`. */
export function monthBounds(ref: Date): { start: Date; end: Date } {
  const start = new Date(ref.getFullYear(), ref.getMonth(), 1);
  const end = new Date(ref.getFullYear(), ref.getMonth() + 1, 1);
  return { start, end };
}

/** ISO date (yyyy-MM-dd) — formato das colunas `date` do Postgres/Drizzle. */
export function toISODate(d: Date): string {
  return dateOnly(d).toISOString().slice(0, 10);
}

/**
 * Avança `iso` (yyyy-MM-dd) em `months` meses, clampando o dia ao fim do mês
 * destino (ex.: 31/01 + 1 mês → 28/02). Usado nas datas das parcelas.
 */
export function addMonthsISO(iso: string, months: number): string {
  const [y, m, d] = iso.split("-").map(Number) as [number, number, number];
  const targetMonthIndex = m - 1 + months;
  const year = y + Math.floor(targetMonthIndex / 12);
  const monthIndex = ((targetMonthIndex % 12) + 12) % 12;
  const day = Math.min(d, lastDayOfMonth(year, monthIndex));
  return toISODate(new Date(year, monthIndex, day));
}
