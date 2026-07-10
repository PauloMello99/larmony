import * as React from "react"
import Link from "next/link"
import { useTranslation } from "react-i18next"
import {
  ArrowLeftRight,
  ArrowDownRight,
  ArrowUpRight,
  CalendarClock,
  PiggyBank,
  Scale,
  Target,
  TrendingDown,
  TrendingUp,
} from "lucide-react"
import { cn } from "@/shared/lib/utils"
import { formatCentsToBRL } from "@/shared/lib/currency"
import { formatDate, useActiveLocale } from "@/shared/lib/format"
import { EmptyState } from "@/shared/components/ui/empty-state"
import { Skeleton } from "@/shared/components/ui/skeleton"
import { useMe } from "@/features/auth/hooks/use-me"
import { useCurrentHousehold } from "@/features/dashboard/components/household-context"
import {
  trendPercent,
  useHouseholdOverview,
  type BudgetProgress,
  type GoalProgress,
  type RecentTransaction,
  type UpcomingBill,
} from "@/features/dashboard/hooks/use-household-overview"

/**
 * Home do lar (overview). Cards de KPI reais (GET /households/:id/overview)
 * com semântica financeira (success=receita, destructive=despesa,
 * warning=vencimento) e trend vs. mês anterior. Enquanto as tabelas finance
 * estiverem vazias (antes do M2), os valores chegam zerados e as seções
 * mostram empty states ricos.
 */

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
  trend?: number | null
  loading?: boolean
}

function SummaryCard({ label, valueCents, icon: Icon, tone = "neutral", trend, loading }: SummaryCardProps) {
  const { t } = useTranslation("dashboard")
  // Para despesas, uma queda (trend negativo) é uma boa notícia — inverte a cor.
  const trendIsGood = tone === "destructive" ? (trend ?? 0) <= 0 : (trend ?? 0) >= 0

  return (
    <div className="rounded-xl border border-foreground/[0.07] bg-foreground/[0.03] p-4 transition-colors hover:border-foreground/[0.12]">
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
      {loading ? (
        <Skeleton className="mt-2 h-7 w-24" />
      ) : (
        <p
          className={cn(
            "mt-2 text-lg font-bold tracking-tight sm:text-xl",
            tone === "success" && "text-success",
            tone === "destructive" && "text-destructive",
            tone === "neutral" && "text-foreground",
          )}
        >
          {formatCentsToBRL(valueCents)}
        </p>
      )}
      {trend !== null && trend !== undefined && !loading && (
        <p
          className={cn(
            "mt-1 flex items-center gap-1 text-[11px] font-medium",
            trendIsGood ? "text-success" : "text-destructive",
          )}
        >
          {trend >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          {Math.abs(trend)}% {t("overview.vsLastMonth")}
        </p>
      )}
    </div>
  )
}

function SectionCard({
  title,
  action,
  children,
  className,
  bodyClassName,
}: {
  title: string
  action?: React.ReactNode
  children: React.ReactNode
  className?: string
  bodyClassName?: string
}) {
  return (
    <section className={cn("flex flex-col rounded-xl border border-foreground/[0.07] bg-foreground/[0.03]", className)}>
      <header className="flex items-center justify-between border-b border-foreground/[0.06] px-4 py-3">
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        {action}
      </header>
      <div className={cn("flex-1", bodyClassName)}>{children}</div>
    </section>
  )
}

function TransactionRow({ tx }: { tx: RecentTransaction }) {
  const isIncome = tx.type === "income"
  const locale = useActiveLocale()
  return (
    <li className="flex items-center gap-3 px-4 py-2.5">
      <span
        className="h-2 w-2 shrink-0 rounded-full"
        style={{ backgroundColor: tx.categoryColor ?? "var(--muted-foreground)" }}
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm text-foreground">{tx.description}</p>
        <p className="text-xs text-muted-foreground">
          {formatDate(tx.date, locale, { day: "2-digit", month: "short" })}
          {tx.categoryName ? ` · ${tx.categoryName}` : ""}
        </p>
      </div>
      <span className={cn("shrink-0 text-sm font-semibold", isIncome ? "text-success" : "text-destructive")}>
        {isIncome ? "+" : "−"}
        {formatCentsToBRL(tx.amountCents)}
      </span>
    </li>
  )
}

function BillRow({ bill }: { bill: UpcomingBill }) {
  const { t } = useTranslation("dashboard")
  const dueLabel =
    bill.daysUntilDue === 0
      ? t("overview.dueToday")
      : t("overview.dueInDays", { count: bill.daysUntilDue })

  return (
    <li className="flex items-center justify-between gap-3 px-4 py-2.5">
      <div className="min-w-0">
        <p className="truncate text-sm text-foreground">{bill.name}</p>
        <p className={cn("text-xs font-medium", bill.daysUntilDue <= 1 ? "text-warning" : "text-muted-foreground")}>
          {dueLabel}
        </p>
      </div>
      <span className="shrink-0 text-sm font-semibold text-foreground">
        {formatCentsToBRL(bill.amountCents)}
      </span>
    </li>
  )
}

function GoalRow({ goal }: { goal: GoalProgress }) {
  const pct = goal.targetCents > 0 ? Math.round((goal.savedCents / goal.targetCents) * 100) : 0
  const done = goal.savedCents >= goal.targetCents

  return (
    <li className="px-4 py-2.5">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: goal.color }} />
          <span className="truncate text-sm text-foreground">{goal.name}</span>
        </div>
        <span className="shrink-0 text-xs text-muted-foreground">
          {formatCentsToBRL(goal.savedCents)} / {formatCentsToBRL(goal.targetCents)}
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-foreground/[0.06]">
        <div
          className={cn("h-full rounded-full", done ? "bg-success" : "bg-primary")}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
    </li>
  )
}

function BudgetRow({ budget }: { budget: BudgetProgress }) {
  const { t } = useTranslation("dashboard")
  const pct = budget.limitCents > 0 ? Math.round((budget.spentCents / budget.limitCents) * 100) : 0
  const over = budget.spentCents > budget.limitCents

  return (
    <li className="px-4 py-2.5">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: budget.categoryColor }} />
          <span className="truncate text-sm text-foreground">{budget.categoryName}</span>
          {over && (
            <span className="shrink-0 rounded-full bg-destructive/10 px-1.5 py-0.5 text-[10px] font-medium text-destructive">
              {t("overview.budgetOver")}
            </span>
          )}
        </div>
        <span className="shrink-0 text-xs text-muted-foreground">
          {formatCentsToBRL(budget.spentCents)} / {formatCentsToBRL(budget.limitCents)}
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-foreground/[0.06]">
        <div
          className={cn("h-full rounded-full", over ? "bg-destructive" : "bg-primary")}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
    </li>
  )
}

export function HouseholdOverview() {
  const { t } = useTranslation("dashboard")
  const locale = useActiveLocale()
  const { me } = useMe()
  const { household } = useCurrentHousehold()
  const { overview, loading } = useHouseholdOverview(household.id)

  const now = new Date()
  const firstName = (me?.name ?? "").split(" ")[0]
  const dateLabel = formatDate(now, locale, { dateStyle: "full" })
  const base = `/households/${household.slug}`

  const income = overview?.currentMonth.incomeCents ?? 0
  const expense = overview?.currentMonth.expenseCents ?? 0
  const balance = overview?.currentMonth.balanceCents ?? 0
  const incomeTrend = overview ? trendPercent(income, overview.previousMonth.incomeCents) : null
  const expenseTrend = overview ? trendPercent(expense, overview.previousMonth.expenseCents) : null

  const transactions = overview?.recentTransactions ?? []
  const bills = overview?.upcomingBills ?? []
  const budgets = overview?.budgets ?? []
  const goals = overview?.goals ?? { savedCents: 0, activeCount: 0, top: [] }

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

      {/* Resumo do mês — KPIs reais (zeros até o M2) */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <SummaryCard
          label={t("overview.incomeMonth")}
          valueCents={income}
          icon={ArrowUpRight}
          tone="success"
          trend={incomeTrend}
          loading={loading}
        />
        <SummaryCard
          label={t("overview.expensesMonth")}
          valueCents={expense}
          icon={ArrowDownRight}
          tone="destructive"
          trend={expenseTrend}
          loading={loading}
        />
        <SummaryCard
          label={t("overview.balanceMonth")}
          valueCents={balance}
          icon={Scale}
          tone={balance >= 0 ? "success" : "destructive"}
          loading={loading}
        />
        <SummaryCard
          label={t("overview.goalsTotal")}
          valueCents={goals.savedCents}
          icon={Target}
          loading={loading}
        />
      </div>

      {/* Conteúdo: transações recentes (2/3) + coluna lateral (1/3) */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="flex lg:col-span-2">
          <SectionCard
            className="h-full w-full"
            title={t("overview.recentTransactions")}
            action={
              transactions.length > 0 ? (
                <Link href={`${base}/transactions`} className="text-xs font-medium text-primary hover:underline">
                  {t("overview.seeAllTransactions")}
                </Link>
              ) : undefined
            }
          >
            {loading ? (
              <div className="space-y-3 p-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : transactions.length > 0 ? (
              <ul className="divide-y divide-foreground/[0.06]">
                {transactions.map((tx) => (
                  <TransactionRow key={tx.id} tx={tx} />
                ))}
              </ul>
            ) : (
              <EmptyState
                icon={ArrowLeftRight}
                title={t("overview.emptyTransactions")}
                description={t("overview.emptyTransactionsHint")}
                action={{ href: `${base}/transactions`, label: t("nav.transactions") }}
                className="h-full min-h-[16rem]"
              />
            )}
          </SectionCard>
        </div>

        <div className="flex flex-col gap-4">
          <SectionCard title={t("overview.upcomingEntries")}>
            {loading ? (
              <div className="space-y-2 p-4">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            ) : bills.length > 0 ? (
              <ul className="divide-y divide-foreground/[0.06]">
                {bills.map((bill) => (
                  <BillRow key={bill.id} bill={bill} />
                ))}
              </ul>
            ) : (
              <EmptyState
                icon={CalendarClock}
                title={t("overview.emptyEntries")}
                description={t("overview.emptyEntriesHint")}
                action={{ href: `${base}/scheduled-transactions`, label: t("nav.scheduledTransactions") }}
              />
            )}
          </SectionCard>

          <SectionCard title={t("overview.budgets")}>
            {loading ? (
              <div className="space-y-2 p-4">
                <Skeleton className="h-8 w-full" />
              </div>
            ) : budgets.length > 0 ? (
              <ul className="divide-y divide-foreground/[0.06]">
                {budgets.map((b) => (
                  <BudgetRow key={b.id} budget={b} />
                ))}
              </ul>
            ) : (
              <EmptyState
                icon={PiggyBank}
                title={t("overview.emptyBudgets")}
                description={t("overview.emptyBudgetsHint")}
                action={{ href: `${base}/budgets`, label: t("nav.budgets") }}
              />
            )}
          </SectionCard>

          <SectionCard
            title={t("overview.activeGoals")}
            action={
              goals.activeCount > 0 ? (
                <span className="text-xs text-muted-foreground">
                  {t("overview.goalsActive", { count: goals.activeCount })}
                </span>
              ) : undefined
            }
          >
            {loading ? (
              <div className="space-y-2 p-4">
                <Skeleton className="h-8 w-full" />
              </div>
            ) : goals.top.length > 0 ? (
              <ul className="divide-y divide-foreground/[0.06]">
                {goals.top.map((g) => (
                  <GoalRow key={g.id} goal={g} />
                ))}
              </ul>
            ) : (
              <EmptyState
                icon={Target}
                title={t("overview.emptyGoals")}
                description={t("overview.emptyGoalsHint")}
                action={{ href: `${base}/goals`, label: t("nav.goals") }}
              />
            )}
          </SectionCard>
        </div>
      </div>
    </div>
  )
}
