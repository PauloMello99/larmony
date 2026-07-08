"use client"

import { BarChart3, PieChart as PieChartIcon, Users } from "lucide-react"
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
import { formatCentsToBRL } from "@/shared/lib/currency"
import { fmtMonthLabel, fmtMonthLong } from "../lib/format"
import type { MonthlyReport } from "../types"
import { ReportTooltip } from "./report-tooltip"

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
}

export function MonthlyView({ report }: MonthlyViewProps) {
  const reducedMotion = usePrefersReducedMotion()

  const barData = report.months.map((m) => ({
    label: fmtMonthLabel(m.year, m.month),
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

  const refLabel = `${fmtMonthLong(report.refMonth.month)} ${report.refMonth.year}`

  return (
    <div className="space-y-4">
      {/* Série 6 meses */}
      <div className="rounded-xl border border-foreground/[0.06] bg-foreground/[0.02] p-4">
        <div className="mb-3 flex items-center gap-1.5 text-sm font-medium text-foreground">
          <BarChart3 className="h-4 w-4 text-primary" />
          Receita × Despesa · últimos 6 meses
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
                  fill={COLORS.income}
                  radius={[4, 4, 0, 0]}
                  isAnimationActive={!reducedMotion}
                />
                <Bar
                  dataKey="Despesa"
                  fill={COLORS.expense}
                  radius={[4, 4, 0, 0]}
                  isAnimationActive={!reducedMotion}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="flex h-64 items-center justify-center text-sm text-foreground/40">
            Sem movimentação nos últimos 6 meses.
          </div>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Pizza por categoria */}
        <div className="rounded-xl border border-foreground/[0.06] bg-foreground/[0.02] p-4">
          <div className="mb-3 flex items-center gap-1.5 text-sm font-medium text-foreground">
            <PieChartIcon className="h-4 w-4 text-primary" />
            Despesas por categoria · {refLabel}
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
              Nenhuma despesa neste mês.
            </div>
          )}
        </div>

        {/* Gasto por pessoa */}
        <div className="rounded-xl border border-foreground/[0.06] bg-foreground/[0.02] p-4">
          <div className="mb-3 flex items-center gap-1.5 text-sm font-medium text-foreground">
            <Users className="h-4 w-4 text-primary" />
            Gasto por pessoa · {refLabel}
          </div>
          {personTotal > 0 ? (
            <div className="space-y-3">
              {allUnassigned && (
                <p className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-600 dark:text-amber-400">
                  Para ver quem gastou o quê, atribua uma pessoa ao criar ou editar
                  cada transação.
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
              Nenhuma despesa neste mês.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
