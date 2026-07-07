/** Formata year/month como "mês/aa" para eixos de gráfico. */
export function fmtMonthLabel(year: number, month: number): string {
  const date = new Date(year, month - 1, 1)
  return date
    .toLocaleDateString("pt-BR", { month: "short", year: "2-digit" })
    .replace(".", "")
}

/** Nome do mês por extenso (pt-BR) para títulos de seção. */
export function fmtMonthLong(month: number): string {
  const date = new Date(2000, month - 1, 1)
  return date.toLocaleDateString("pt-BR", { month: "long" })
}
