"use client"

import { useState } from "react"
import Link from "next/link"
import { BarChart3, PlusCircle } from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import { Skeleton } from "@/shared/components/ui/skeleton"
import { cn } from "@/shared/lib/utils"
import { useCurrentHousehold } from "@/features/dashboard/components/household-context"
import { useMonthlyReport } from "../hooks/use-monthly-report"
import { useAnnualReport } from "../hooks/use-annual-report"
import { MonthlyView } from "./monthly-view"
import { AnnualView } from "./annual-view"
import type { ReportView } from "../types"

export function ReportsPage() {
  const { household, householdId } = useCurrentHousehold()
  const [view, setView] = useState<ReportView>("monthly")
  const [year, setYear] = useState(() => new Date().getFullYear())

  const monthly = useMonthlyReport(householdId)
  const annual = useAnnualReport(householdId, year)

  const loading = view === "monthly" ? monthly.loading : annual.loading
  const error = view === "monthly" ? monthly.error : annual.error

  // Só a vista mensal usa o empty-state global (não há navegação — a janela é
  // sempre "últimos 6 meses"). A anual é navegável por ano: um ano vazio não
  // pode esconder os botões de navegação, senão o usuário fica preso sem
  // conseguir voltar a um ano com dados. A AnnualView já trata "sem
  // movimentação neste ano" internamente, mantendo a navegação visível.
  const hasNoData =
    view === "monthly" &&
    monthly.report !== null &&
    monthly.report.months.every((m) => m.incomeCents === 0 && m.expenseCents === 0)

  const transactionsHref = `/dashboard/household/${household.slug}/transactions`

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground sm:text-2xl">Relatórios</h1>
          <p className="mt-1 text-sm text-foreground/40">
            Visão mensal e anual das suas finanças
          </p>
        </div>

        <div className="flex rounded-md border border-foreground/[0.08] p-0.5 text-xs sm:w-auto">
          {(["monthly", "annual"] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              className={cn(
                "flex-1 rounded px-4 py-1.5 font-medium transition-colors sm:flex-none",
                view === v
                  ? "bg-primary text-primary-foreground"
                  : "text-foreground/50 hover:text-foreground",
              )}
            >
              {v === "monthly" ? "Mensal" : "Anual"}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-64 w-full rounded-xl" />
          <div className="grid gap-4 lg:grid-cols-2">
            <Skeleton className="h-64 w-full rounded-xl" />
            <Skeleton className="h-64 w-full rounded-xl" />
          </div>
        </div>
      ) : hasNoData ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-foreground/10 py-16 text-center sm:py-20">
          <BarChart3 className="mb-4 h-10 w-10 text-foreground/20" />
          <p className="text-sm text-foreground/40">
            Nenhuma transação ainda. Lance receitas e despesas para ver os relatórios.
          </p>
          <Button
            asChild
            className="mt-4 w-full bg-primary text-primary-foreground hover:bg-primary/90 sm:w-auto"
            size="sm"
          >
            <Link href={transactionsHref}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Ir para transações
            </Link>
          </Button>
        </div>
      ) : view === "monthly" && monthly.report ? (
        <MonthlyView report={monthly.report} />
      ) : annual.report ? (
        <AnnualView report={annual.report} year={year} onYearChange={setYear} />
      ) : null}
    </div>
  )
}
