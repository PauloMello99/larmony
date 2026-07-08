import type { RecurrenceFrequency } from "../types"

/** Rótulo humano da cadência (ex.: "Mensal", "Quinzenal", "A cada 4 meses"). */
export function frequencyLabel(frequency: RecurrenceFrequency, interval: number): string {
  if (frequency === "weekly") {
    if (interval === 1) return "Semanal"
    if (interval === 2) return "Quinzenal"
    return `A cada ${interval} semanas`
  }
  if (frequency === "monthly") {
    if (interval === 1) return "Mensal"
    if (interval === 2) return "Bimestral"
    if (interval === 3) return "Trimestral"
    if (interval === 6) return "Semestral"
    return `A cada ${interval} meses`
  }
  if (interval === 1) return "Anual"
  return `A cada ${interval} anos`
}

/** yyyy-MM-dd → dd/MM/yyyy. */
export function formatISODate(iso: string): string {
  const [y, m, d] = iso.split("-")
  return `${d}/${m}/${y}`
}
