/**
 * Divisão determinística de um total em `n` fatias inteiras de centavos.
 * A **primeira fatia absorve a sobra** (ADR-0017) — a soma das fatias é sempre
 * exatamente `totalCents`. Reusado por parcelamento e rateio igual.
 */
export function splitEqually(totalCents: number, n: number): number[] {
  if (n <= 0) throw new Error("split requires n >= 1");
  const base = Math.floor(totalCents / n);
  const remainder = totalCents - base * n;
  return Array.from({ length: n }, (_, i) => (i === 0 ? base + remainder : base));
}
