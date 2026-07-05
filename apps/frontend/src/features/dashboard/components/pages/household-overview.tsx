import * as React from "react"
import { useTranslation } from "react-i18next"
import {
  ArrowLeftRight,
  ArrowDownRight,
  ArrowUpRight,
  PiggyBank,
  ReceiptText,
  Scale,
  Target,
} from "lucide-react"
import { cn } from "@/shared/lib/utils"
import { EmptyState } from "@/shared/components/ui/empty-state"
import { useMe } from "@/features/auth/hooks/use-me"
import { useCurrentHousehold } from "@/features/dashboard/components/household-context"

/**
 * Home do lar (overview). Esqueleto real do dashboard: cards de resumo com a
 * semântica financeira (success=receita, destructive=despesa, warning=vencimento)
 * e seções com empty states ricos. Os dados chegam com o M2 (transactions) —
 * até lá os valores são R$ 0,00 e as listas mostram os empty states.
 */

const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" })

function greetingKey(hour: number): string {
  if (hour < 12) return "overview.goodMorning"
  if (hour < 18) return "overview.goodAfternoon"
  return "overview.goodEvening"
}

interface SummaryCardProps {
  label: string
  valueCents: number
  icon: React.ComponentType<{ className?: string }>
  tone?: "success" | "destructive" | "neutral"
}

function SummaryCard({ label, valueCents, icon: Icon, tone = "neutral" }: SummaryCardProps) {
  return (
    <div className="rounded-xl border border-foreground/[0.06] bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-xs font-medium text-muted-foreground">{label}</p>
        <Icon
          className={cn(
            "h-4 w-4 shrink-0",
            tone === "success" && "text-success",
            tone === "destructive" && "text-destructive",
            tone === "neutral" && "text-primary",
          )}
        />
      </div>
      <p
        className={cn(
          "mt-2 text-lg font-bold tracking-tight sm:text-xl",
          tone === "success" && "text-success",
          tone === "destructive" && "text-destructive",
          tone === "neutral" && "text-foreground",
        )}
      >
        {BRL.format(valueCents / 100)}
      </p>
    </div>
  )
}

function SectionCard({
  title,
  action,
  children,
}: {
  title: string
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section className="rounded-xl border border-foreground/[0.06] bg-card">
      <header className="flex items-center justify-between border-b border-foreground/[0.06] px-4 py-3">
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        {action}
      </header>
      {children}
    </section>
  )
}

export function HouseholdOverview() {
  const { t } = useTranslation("dashboard")
  const { me } = useMe()
  const { household } = useCurrentHousehold()

  const now = new Date()
  const firstName = (me?.name ?? "").split(" ")[0]
  const dateLabel = new Intl.DateTimeFormat("pt-BR", { dateStyle: "full" }).format(now)
  const base = `/dashboard/household/${household.slug}`

  return (
    <div className="flex flex-col gap-6">
      {/* Saudação */}
      <div>
        <h1 className="text-xl font-bold text-foreground sm:text-2xl">
          {t(greetingKey(now.getHours()))}
          {firstName ? `, ${firstName}` : ""} 👋
        </h1>
        <p className="mt-0.5 text-sm capitalize text-muted-foreground">{dateLabel}</p>
      </div>

      {/* Resumo do mês — dados reais chegam no M2 */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <SummaryCard label={t("overview.incomeMonth")} valueCents={0} icon={ArrowUpRight} tone="success" />
        <SummaryCard label={t("overview.expensesMonth")} valueCents={0} icon={ArrowDownRight} tone="destructive" />
        <SummaryCard label={t("overview.balanceMonth")} valueCents={0} icon={Scale} />
        <SummaryCard label={t("overview.goalsTotal")} valueCents={0} icon={Target} />
      </div>

      {/* Conteúdo: transações recentes (2/3) + coluna lateral (1/3) */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <SectionCard title={t("overview.recentTransactions")}>
            <EmptyState
              icon={ArrowLeftRight}
              title={t("overview.emptyTransactions")}
              description={t("overview.emptyTransactionsHint")}
              action={{ href: `${base}/transactions`, label: t("nav.transactions") }}
              className="min-h-[16rem]"
            />
          </SectionCard>
        </div>

        <div className="flex flex-col gap-4">
          <SectionCard title={t("overview.upcomingBills")}>
            <EmptyState
              icon={ReceiptText}
              title={t("overview.emptyBills")}
              description={t("overview.emptyBillsHint")}
              action={{ href: `${base}/bills`, label: t("nav.bills") }}
            />
          </SectionCard>

          <SectionCard title={t("overview.budgets")}>
            <EmptyState
              icon={PiggyBank}
              title={t("overview.emptyBudgets")}
              description={t("overview.emptyBudgetsHint")}
              action={{ href: `${base}/budgets`, label: t("nav.budgets") }}
            />
          </SectionCard>

          <SectionCard title={t("overview.activeGoals")}>
            <EmptyState
              icon={Target}
              title={t("overview.emptyGoals")}
              description={t("overview.emptyGoalsHint")}
              action={{ href: `${base}/goals`, label: t("nav.goals") }}
            />
          </SectionCard>
        </div>
      </div>
    </div>
  )
}
