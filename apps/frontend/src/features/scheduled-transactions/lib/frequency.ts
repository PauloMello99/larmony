import type { TFunction } from "i18next"
import type { ScheduledEntryFrequency } from "../types"

/** Rótulo humano da cadência (ex.: "Mensal", "Quinzenal", "A cada 4 meses").
 * Recebe o `t` do namespace `scheduled-transactions`. */
export function frequencyLabel(
  frequency: ScheduledEntryFrequency,
  interval: number,
  t: TFunction,
): string {
  if (frequency === "weekly") {
    if (interval === 1) return t("frequency.weekly")
    if (interval === 2) return t("frequency.biweekly")
    return t("frequency.everyWeeks", { count: interval })
  }
  if (frequency === "monthly") {
    if (interval === 1) return t("frequency.monthly")
    if (interval === 2) return t("frequency.bimonthly")
    if (interval === 3) return t("frequency.quarterly")
    if (interval === 6) return t("frequency.semiannual")
    return t("frequency.everyMonths", { count: interval })
  }
  if (interval === 1) return t("frequency.yearly")
  return t("frequency.everyYears", { count: interval })
}
