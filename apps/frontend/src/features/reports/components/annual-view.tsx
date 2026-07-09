"use client"

import { ChevronLeft, ChevronRight, TrendingDown, TrendingUp, Wallet } from "lucide-react"
import { useTranslation } from "react-i18next"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { usePrefersReducedMotion } from "@/shared/lib/use-prefers-reduced-motion"
import { Button } from "@/shared/components/ui/button"
import { formatCentsToBRL } from "@/shared/lib/currency"
import { useActiveLocale } from "@/shared/lib/format"
import { cn } from "@/shared/lib/utils"
import { fmtMonthLabel } from "../lib/format"
import type { AnnualReport } from "../types"
import { ReportTooltip } from "./report-tooltip"

const COLORS = {
  income: "var(--success)",
  expense: "var(--destructive)",
  axis: "rgba(255,255,255,0.4)",
  grid: "rgba(255,255,255,0.06)",
}

function formatAxisCents(value: number): string {
  if (value >= 100_000) return `R$ ${(value / 100_000).toFixed(0)}k`
  if (value >= 100) return `R$ ${(value / 100).toFixed(0)}`
  return formatCentsToBRL(value)
}

function StatCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string
  value: string
  icon: typeof Wallet
  tone?: "success" | "destructive" | "default"
}) {
  return (
    <div className="rounded-xl border border-foreground/[0.06] bg-foreground/[0.02] p-4">
      <div className="flex items-center gap-1.5 text-xs text-foreground/50">
        <Icon
          className={cn(
            "h-3.5 w-3.5",
            tone === "success" && "text-success",
            tone === "destructive" && "text-destructive",
            !tone && "text-primary",
          )}
        />
        {label}
      </div>
      <p
        className={cn(
          "mt-1.5 text-xl font-semibold tabular-nums sm:text-2xl",
          tone === "success" && "text-success",
          tone === "destructive" && "text-destructive",
          !tone && "text-foreground",
        )}
      >
        {value}
      </p>
    </div>
  )
}

interface AnnualViewProps {
  report: AnnualReport
  year: number
  onYearChange: (year: number) => void
}

export function AnnualView({ report, year, onYearChange }: AnnualViewProps) {
  const { t } = useTranslation("reports")
  const locale = useActiveLocale()
  const reducedMotion = usePrefersReducedMotion()

  const barData = report.months.map((m) => ({
    label: fmtMonthLabel(m.year, m.month, locale),
    Receita: m.incomeCents,
    Despesa: m.expenseCents,
  }))

  const hasSeries = report.months.some((m) => m.incomeCents > 0 || m.expenseCents > 0)
  const balanceTone =
    report.totals.balanceCents >= 0 ? ("success" as const) : ("destructive" as const)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-center gap-3">
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => onYearChange(year - 1)}
          aria-label={t("annual.prevYear")}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="min-w-[4rem] text-center text-sm font-semibold tabular-nums text-foreground">
          {year}
        </span>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => onYearChange(year + 1)}
          aria-label={t("annual.nextYear")}
          disabled={year >= new Date().getFullYear()}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard
          label={t("annual.totalIncome")}
          value={formatCentsToBRL(report.totals.incomeCents)}
          icon={TrendingUp}
          tone="success"
        />
        <StatCard
          label={t("annual.totalExpense")}
          value={formatCentsToBRL(report.totals.expenseCents)}
          icon={TrendingDown}
          tone="destructive"
        />
        <StatCard
          label={t("annual.balance")}
          value={formatCentsToBRL(report.totals.balanceCents)}
          icon={Wallet}
          tone={balanceTone}
        />
      </div>

      <div className="rounded-xl border border-foreground/[0.06] bg-foreground/[0.02] p-4">
        <div className="mb-3 text-sm font-medium text-foreground">
          {t("annual.seriesTitle", { year })}
        </div>
        {hasSeries ? (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
                <CartesianGrid stroke={COLORS.grid} vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fill: COLORS.axis, fontSize: 10 }}
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
          <div className="flex h-72 items-center justify-center text-sm text-foreground/40">
            {t("annual.seriesEmpty", { year })}
          </div>
        )}
      </div>
    </div>
  )
}
