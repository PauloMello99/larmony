"use client"

import { useState } from "react"
import { useTranslation } from "react-i18next"
import { Lock } from "lucide-react"
import { Skeleton } from "@/shared/components/ui/skeleton"
import { cn } from "@/shared/lib/utils"
import { useCurrentHousehold } from "@/features/dashboard/components/household-context"
import { useEntitlements, PremiumGate } from "@/features/subscription"
import { useMonthlyReport } from "../hooks/use-monthly-report"
import { useAnnualReport } from "../hooks/use-annual-report"
import { MonthlyView } from "./monthly-view"
import { AnnualView } from "./annual-view"
import type { MonthRef, ReportView } from "../types"

export function ReportsPage() {
  const { t } = useTranslation("reports")
  const { householdId } = useCurrentHousehold()
  const [view, setView] = useState<ReportView>("monthly")
  const now = new Date()
  const [year, setYear] = useState(() => now.getFullYear())
  const [monthRef, setMonthRef] = useState<MonthRef>(() => ({
    year: now.getFullYear(),
    month: now.getMonth() + 1,
  }))

  // Relatório anual é premium-only (B-4). Reflete o backend — nunca decide
  // acesso no cliente; só evita disparar a request condenada e oferece upgrade.
  const { capabilities, loading: entLoading } = useEntitlements(householdId)
  const canAnnual = capabilities.advanced_reports

  const monthly = useMonthlyReport(householdId, monthRef.year, monthRef.month)
  const annual = useAnnualReport(householdId, year, canAnnual)

  const annualLocked = view === "annual" && !entLoading && !canAnnual
  const loading =
    view === "monthly"
      ? monthly.loading
      : entLoading || (canAnnual && annual.loading)
  const error = view === "monthly" ? monthly.error : annual.error

  // Ambas as vistas são navegáveis (mês / ano), então tratam "sem movimentação"
  // internamente — nenhuma usa empty-state global, senão a navegação some e o
  // usuário fica preso num período vazio sem conseguir voltar.

  return (
    <div className="flex flex-col">
      <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground sm:text-2xl">{t("page.title")}</h1>
          <p className="mt-1 text-sm text-foreground/40">{t("page.description")}</p>
        </div>

        <div className="flex rounded-md border border-foreground/[0.08] p-0.5 text-xs sm:w-auto">
          {(["monthly", "annual"] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded px-4 py-1.5 font-medium transition-colors sm:flex-none",
                view === v
                  ? "bg-primary text-primary-foreground"
                  : "text-foreground/50 hover:text-foreground",
              )}
            >
              {v === "monthly" ? t("page.monthly") : t("page.annual")}
              {v === "annual" && !canAnnual && !entLoading && (
                <Lock className="h-3 w-3 opacity-70" />
              )}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {annualLocked ? (
        <PremiumGate />
      ) : loading ? (
        <div className="space-y-4">
          <Skeleton className="h-64 w-full rounded-xl" />
          <div className="grid gap-4 lg:grid-cols-2">
            <Skeleton className="h-64 w-full rounded-xl" />
            <Skeleton className="h-64 w-full rounded-xl" />
          </div>
        </div>
      ) : view === "monthly" && monthly.report ? (
        <MonthlyView report={monthly.report} monthRef={monthRef} onMonthChange={setMonthRef} />
      ) : view === "annual" && annual.report ? (
        <AnnualView report={annual.report} year={year} onYearChange={setYear} />
      ) : null}
    </div>
  )
}
