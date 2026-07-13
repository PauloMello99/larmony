import type { TFunction } from "i18next"

/** Formata uma data ISO como "dd mês aaaa" no locale ativo.
 * Recebe o `t` do namespace `admin` (lê `format.dateLocale`). */
export function fmtDate(iso: string, t: TFunction): string {
  return new Date(iso).toLocaleDateString(t("format.dateLocale"), {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

/** Formata um mês "YYYY-MM" como "mês/aa" no locale ativo para eixos de gráfico.
 * Recebe o `t` do namespace `admin` (lê `format.dateLocale`). */
export function fmtMonth(month: string, t: TFunction): string {
  const [y, m] = month.split("-")
  const date = new Date(Number(y), Number(m) - 1, 1)
  return date
    .toLocaleDateString(t("format.dateLocale"), { month: "short", year: "2-digit" })
    .replace(".", "")
}
