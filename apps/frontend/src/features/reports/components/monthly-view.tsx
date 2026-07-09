"use client"

import {
  BarChart3,
  ChevronLeft,
  ChevronRight,
  PieChart as PieChartIcon,
  Users,
} from "lucide-react"
import { useTranslation } from "react-i18next"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { usePrefersReducedMotion } from "@/features/admin/lib/use-prefers-reduced-motion"
import { Button } from "@/shared/components/ui/button"
import { formatCentsToBRL } from "@/shared/lib/currency"
import { useActiveLocale } from "@/shared/lib/format"
import { fmtMonthLabel, fmtMonthLong } from "../lib/format"
import type { MonthRef, MonthlyReport } from "../types"
import { ReportTooltip } from "./report-tooltip"

/** Desloca um mês de referência em `delta` meses, com virada de ano. */
function shiftMonth(ref: MonthRef, delta: number): MonthRef {
  const d = new Date(ref.year, ref.month - 1 + delta, 1)
  return { year: d.getFullYear(), month: d.getMonth() + 1 }
}

const COLORS = {
  income: "var(--success)",
  expense: "var(--destructive)",
  axis: "rgba(255,255,255,0.4)",
  grid: "rgba(255,255,255,0.06)",
}

const CHART_FALLBACK = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
]

function formatAxisCents(value: number): string {
  if (value >= 100_000) return `R$ ${(value / 100_000).toFixed(0)}k`
  if (value >= 100) return `R$ ${(value / 100).toFixed(0)}`
  return formatCentsToBRL(value)
}

interface MonthlyViewProps {
  report: MonthlyReport
  monthRef: MonthRef
  onMonthChange: (ref: MonthRef) => void
}

export function MonthlyView({ report, monthRef, onMonthChange }: MonthlyViewProps) {
  const { t } = useTranslation("reports")
  const locale = useActiveLocale()
  const reducedMotion = usePrefersReducedMotion()

  const now = new Date()
  // Não deixa navegar para o futuro (não há dados adiante do mês corrente).
  const isCurrentOrFuture =
    monthRef.year > now.getFullYear() ||
    (monthRef.year === now.getFullYear() && monthRef.month >= now.getMonth() + 1)
  // Rótulo do seletor derivado do estado (atualiza no clique, sem esperar o
  // fetch); os títulos dos gráficos usam report.refMonth (o dado exibido).
  const navLabel = `${fmtMonthLong(monthRef.month, locale)} ${monthRef.year}`

  const barData = report.months.map((m) => ({
    label: fmtMonthLabel(m.year, m.month, locale),
    Receita: m.incomeCents,
    Despesa: m.expenseCents,
  }))

  const hasSeries = report.months.some((m) => m.incomeCents > 0 || m.expenseCents > 0)
  const categoryTotal = report.byCategory.reduce((s, c) => s + c.amountCents, 0)
  const personTotal = report.byPerson.reduce((s, p) => s + p.amountCents, 0)
  const allUnassigned =
    report.byPerson.length === 1 &&
    report.byPerson[0]?.name === "Sem pessoa" &&
    (report.byPerson[0]?.amountCents ?? 0) > 0

  const refLabel = `${fmtMonthLong(report.refMonth.month, locale)} ${report.refMonth.year}`

  return (
    <div className="space-y-4">
      {/* Seletor de mês de referência */}
      <div className="flex items-center justify-center gap-3">
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => onMonthChange(shiftMonth(monthRef, -1))}
          aria-label={t("monthly.prevMonth")}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="min-w-[9rem] text-center text-sm font-semibold capitalize tabular-nums text-foreground">
          {navLabel}
        </span>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => onMonthChange(shiftMonth(monthRef, 1))}
          aria-label={t("monthly.nextMonth")}
          disabled={isCurrentOrFuture}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Série 6 meses */}
      <div className="rounded-xl border border-foreground/[0.06] bg-foreground/[0.02] p-4">
        <div className="mb-3 flex items-center gap-1.5 text-sm font-medium text-foreground">
          <BarChart3 className="h-4 w-4 text-primary" />
          {t("monthly.seriesTitle")}
        </div>
        {hasSeries ? (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
                <CartesianGrid stroke={COLORS.grid} vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fill: COLORS.axis, fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tickFormatter={formatAxisCents}
                  tick={{ fill: COLORS.axis, fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  width={48}
                />
                <Tooltip content={<ReportTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar
                  dataKey="Receita"
                  name={t("chart.income")}
                  fill={COLORS.income}
                  radius={[4, 4, 0, 0]}
                  isAnimationActive={!reducedMotion}
                />
                <Bar
                  dataKey="Despesa"
                  name={t("chart.expense")}
                  fill={COLORS.expense}
                  radius={[4, 4, 0, 0]}
                  isAnimationActive={!reducedMotion}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="flex h-64 items-center justify-center text-sm text-foreground/40">
            {t("monthly.seriesEmpty")}
          </div>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Pizza por categoria */}
        <div className="rounded-xl border border-foreground/[0.06] bg-foreground/[0.02] p-4">
          <div className="mb-3 flex items-center gap-1.5 text-sm font-medium text-foreground">
            <PieChartIcon className="h-4 w-4 text-primary" />
            {t("monthly.byCategory", { ref: refLabel })}
          </div>
          {categoryTotal > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={report.byCategory}
                    dataKey="amountCents"
                    nameKey="name"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    isAnimationActive={!reducedMotion}
                  >
                    {report.byCategory.map((entry, i) => (
                      <Cell
                        key={entry.categoryId ?? `uncat-${i}`}
                        fill={entry.color || CHART_FALLBACK[i % CHART_FALLBACK.length]}
                        stroke="transparent"
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<ReportTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex h-64 items-center justify-center text-sm text-foreground/40">
              {t("monthly.noExpenses")}
            </div>
          )}
        </div>

        {/* Gasto por pessoa */}
        <div className="rounded-xl border border-foreground/[0.06] bg-foreground/[0.02] p-4">
          <div className="mb-3 flex items-center gap-1.5 text-sm font-medium text-foreground">
            <Users className="h-4 w-4 text-primary" />
            {t("monthly.byPerson", { ref: refLabel })}
          </div>
          {personTotal > 0 ? (
            <div className="space-y-3">
              {allUnassigned && (
                <p className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-600 dark:text-amber-400">
                  {t("monthly.assignPersonHint")}
                </p>
              )}
              {report.byPerson.map((person, i) => {
                const pct = personTotal > 0 ? (person.amountCents / personTotal) * 100 : 0
                const color = CHART_FALLBACK[i % CHART_FALLBACK.length]!
                return (
                  <div key={person.userId ?? "sem-pessoa"}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="font-medium text-foreground">{person.name}</span>
                      <span className="tabular-nums text-foreground/60">
                        {formatCentsToBRL(person.amountCents)}
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-foreground/[0.06]">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${pct}%`, backgroundColor: color }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="flex h-64 items-center justify-center text-sm text-foreground/40">
              {t("monthly.noExpenses")}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
