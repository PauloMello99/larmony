import { localISODate } from "../time/tz-clock";

/** Último dia do mês de `year`/`monthIndex` (monthIndex 0-based). */
export function lastDayOfMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate();
}

/** Data-only (meia-noite local) — comparações de dias sem efeito de horário. */
export function dateOnly(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
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

/** ISO (yyyy-MM-dd) do 1º dia do período `month`(1-12)/`year`. */
export function periodStart(month: number, year: number): string {
  return toISODate(new Date(year, month - 1, 1));
}

/**
 * Mês/ano (1-12/YYYY) do período corrente **no fuso do lar** — âncora ÚNICA de
 * toda a imutabilidade de orçamentos versionados (M10, ver
 * `docs/product/features/11-orcamentos-recorrentes.md`): tanto a checagem de
 * "período editável" quanto o anchor de create/edit usam esta função, para
 * nunca divergir. O `timezone` (IANA de `households.timezone`) é obrigatório
 * desde o M12 (ADR-0024) — cada chamador household-scoped resolve o fuso do
 * lar e o passa aqui. Calculado a partir de `localISODate` (string, robusto a
 * qualquer TZ do processo — não usa `toISOString` ingênuo).
 */
export function currentMonthYear(
  timezone: string,
  now: Date = new Date(),
): { month: number; year: number } {
  const [year, month] = localISODate(timezone, now).split("-").map(Number) as [
    number,
    number,
    number,
  ];
  return { month, year };
}

/** ISO (yyyy-MM-dd) do 1º dia do mês corrente no fuso do lar — mesma âncora de `currentMonthYear`. */
export function currentPeriodStart(timezone: string, now: Date = new Date()): string {
  const { month, year } = currentMonthYear(timezone, now);
  return `${year}-${String(month).padStart(2, "0")}-01`;
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

/**
 * Avança `iso` (yyyy-MM-dd) em `days` dias-calendário (sem clamp — o dia corre
 * normalmente para o mês/ano seguinte). Usado na recorrência semanal.
 */
export function addDaysISO(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number) as [number, number, number];
  return toISODate(new Date(y, m - 1, d + days));
}

function isoToLocalDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number) as [number, number, number];
  return new Date(y, m - 1, d);
}

/**
 * Próxima ocorrência (>= `today`, inclusive) de uma cadência ancorada em
 * `startDate`, calculada ESTATELESSAMENTE — sem cursor. Usada pelos
 * lançamentos programados no modo `manual` (lembrete + card "próximos"), que
 * não têm `next_run_date` (ver ADR-0020).
 *
 * Cada ocorrência é derivada por aritmética direta a partir do dia-de-origem
 * (`startDate`), NÃO por iteração sobre um cursor já clampado — isso evita o
 * drift que reusar a lógica do engine (`nextRunOnOrAfter`) causaria: um dia de
 * origem 31 clamparia para 28/fev e todas as ocorrências seguintes ficariam
 * coladas em 28 permanentemente. Aqui, cada mês-alvo clampa o dia 31 de novo,
 * do zero — mesmo comportamento do antigo `nextDueDate(dueDay, today)`.
 *
 * Compartilhada entre os módulos `scheduled-transactions` (lembrete) e
 * `households` (card "Próximos lançamentos" do overview) — por isso vive em
 * `common/`, não no domínio de nenhum dos dois módulos.
 */
export function nextManualOccurrence(
  startDateISO: string,
  today: Date,
  frequency: "weekly" | "monthly" | "yearly",
  interval: number,
): Date {
  const todayOnly = dateOnly(today);

  if (frequency === "weekly") {
    const periodDays = 7 * interval;
    const start = isoToLocalDate(startDateISO);
    const diffDays = Math.round((todayOnly.getTime() - start.getTime()) / 86_400_000);
    const steps = Math.max(0, Math.ceil(diffDays / periodDays));
    return isoToLocalDate(addDaysISO(startDateISO, steps * periodDays));
  }

  const [y0, m0, d0] = startDateISO.split("-").map(Number) as [number, number, number];
  const monthsPerStep = frequency === "yearly" ? 12 * interval : interval;
  const anchorMonthIndex = y0 * 12 + (m0 - 1);
  const todayMonthIndex = todayOnly.getFullYear() * 12 + todayOnly.getMonth();

  const clampAt = (monthIndex: number): Date => {
    const year = Math.floor(monthIndex / 12);
    const monthInYear = ((monthIndex % 12) + 12) % 12;
    const day = Math.min(d0, lastDayOfMonth(year, monthInYear));
    return new Date(year, monthInYear, day);
  };

  let steps = Math.max(0, Math.ceil((todayMonthIndex - anchorMonthIndex) / monthsPerStep));
  let candidate = clampAt(anchorMonthIndex + steps * monthsPerStep);
  // Correção defensiva: o dia clampado do mês estimado ainda pode cair antes
  // de hoje (ex.: dia-de-origem 2, hoje é dia 20 do mesmo mês-alvo estimado) —
  // avança mais um passo até realmente alcançar >= hoje.
  while (candidate < todayOnly) {
    steps++;
    candidate = clampAt(anchorMonthIndex + steps * monthsPerStep);
  }
  return candidate;
}
