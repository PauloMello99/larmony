import { formatDate, monthName } from "@/shared/lib/format"
import type { AppLocale } from "@/shared/lib/locale"

/** Formata year/month como "mês/aa" para eixos de gráfico. */
export function fmtMonthLabel(year: number, month: number, locale: AppLocale): string {
  return formatDate(new Date(year, month - 1, 1), locale, {
    month: "short",
    year: "2-digit",
  }).replace(".", "")
}

/** Nome do mês por extenso (no locale ativo) para títulos de seção. */
export function fmtMonthLong(month: number, locale: AppLocale): string {
  return monthName(month - 1, locale, "long")
}
