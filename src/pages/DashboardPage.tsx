import { useQuery } from '@tanstack/react-query'
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Link } from '@tanstack/react-router'
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Target,
  AlertTriangle,
  Clock,
  ArrowRight,
} from 'lucide-react'
import { supabase } from '@/services/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useTransactionSummary } from '@/queries/transactions'
import { useBills } from '@/queries/bills'
import { useGoals } from '@/queries/goals'
import { useBudgets, useBudgetSpending } from '@/queries/budgets'
import { formatBRL } from '@/lib/currency'
import { getDaysUntilDue } from '@/lib/date'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { AmountDisplay } from '@/components/atoms/AmountDisplay'
import { LoadingSpinner } from '@/components/atoms/LoadingSpinner'
import type { Tables } from '@/types/database.types'

type Transaction = Tables<'transactions'> & {
  categories: { name: string; color: string } | null
}

function useRecentTransactions() {
  const { householdId } = useAuth()
  return useQuery({
    queryKey: ['recent-transactions', householdId],
    queryFn: async () => {
      if (!householdId) return []
      const { data } = await supabase
        .from('transactions')
        .select('*, categories(name, color)')
        .eq('household_id', householdId)
        .order('date', { ascending: false })
        .limit(5)
      return (data ?? []) as unknown as Transaction[]
    },
    enabled: !!householdId,
  })
}

function usePreviousMonthSummary() {
  const { householdId } = useAuth()
  const prev = subMonths(new Date(), 1)
  const from = format(startOfMonth(prev), 'yyyy-MM-dd')
  const to = format(endOfMonth(prev), 'yyyy-MM-dd')
  return useQuery({
    queryKey: ['prev-month-summary', householdId],
    queryFn: async () => {
      if (!householdId) return { income: 0, expense: 0 }
      const { data } = await supabase
        .from('transactions')
        .select('type, amount')
        .eq('household_id', householdId)
        .gte('date', from)
        .lte('date', to)
      const income = (data ?? [])
        .filter((t) => t.type === 'income')
        .reduce((s, t) => s + t.amount, 0)
      const expense = (data ?? [])
        .filter((t) => t.type === 'expense')
        .reduce((s, t) => s + t.amount, 0)
      return { income, expense }
    },
    enabled: !!householdId,
  })
}

function StatCard({
  title,
  value,
  icon: Icon,
  color,
  trend,
  trendLabel,
}: {
  title: string
  value: string
  icon: React.ElementType
  color: string
  trend?: 'up' | 'down' | 'neutral'
  trendLabel?: string
}) {
  return (
    <Card>
      <CardContent className="pt-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">{title}</p>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            {trendLabel && (
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                {trend === 'up' ? (
                  <TrendingUp className="size-3 text-green-500" />
                ) : trend === 'down' ? (
                  <TrendingDown className="size-3 text-red-500" />
                ) : null}
                {trendLabel}
              </p>
            )}
          </div>
          <div
            className={`rounded-lg p-2.5 ${color === 'text-green-600' ? 'bg-green-100 dark:bg-green-900/30' : color === 'text-red-600' ? 'bg-red-100 dark:bg-red-900/30' : 'bg-primary/10'}`}
          >
            <Icon className={`size-5 ${color}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function DashboardPage() {
  const { profile } = useAuth()
  const today = new Date()
  const month = today.getMonth() + 1
  const year = today.getFullYear()

  const { data: summary, isLoading: summaryLoading } = useTransactionSummary(month, year)
  const { data: prevSummary } = usePreviousMonthSummary()
  const { data: recentTx = [], isLoading: txLoading } = useRecentTransactions()
  const { data: bills = [] } = useBills()
  const { data: goals = [] } = useGoals()
  const { data: budgets = [] } = useBudgets(month, year)
  const { data: spending = {} } = useBudgetSpending(month, year)

  const activeBills = bills.filter((b) => b.is_active)
  const upcomingBills = activeBills
    .filter((b) => getDaysUntilDue(b.due_day) <= 7)
    .sort((a, b) => getDaysUntilDue(a.due_day) - getDaysUntilDue(b.due_day))
    .slice(0, 3)

  const activeGoals = goals.filter((g) => g.status === 'active').slice(0, 3)

  type BudgetWithCat = (typeof budgets)[0] & { categories: { name: string; color: string } | null }
  const overBudget = (budgets as BudgetWithCat[]).filter(
    (b) => (spending[b.category_id] ?? 0) > b.limit_amount
  )

  const totalSavings = goals.reduce((s, g) => s + g.current_amount, 0)

  const expenseTrend =
    prevSummary && summary ? (summary.expense > prevSummary.expense ? 'up' : 'down') : 'neutral'

  const greeting = (() => {
    const h = today.getHours()
    if (h < 12) return 'Bom dia'
    if (h < 18) return 'Boa tarde'
    return 'Boa noite'
  })()

  if (summaryLoading) return <LoadingSpinner />

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold">
          {greeting}, {profile?.full_name?.split(' ')[0] ?? 'usuário'} 👋
        </h1>
        <p className="text-sm text-muted-foreground capitalize">
          {format(today, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Receitas do mês"
          value={formatBRL(summary?.income ?? 0)}
          icon={TrendingUp}
          color="text-green-600"
          trendLabel={prevSummary ? `Mês anterior: ${formatBRL(prevSummary.income)}` : undefined}
        />
        <StatCard
          title="Despesas do mês"
          value={formatBRL(summary?.expense ?? 0)}
          icon={TrendingDown}
          color="text-red-600"
          trend={expenseTrend}
          trendLabel={prevSummary ? `Mês anterior: ${formatBRL(prevSummary.expense)}` : undefined}
        />
        <StatCard
          title="Saldo do mês"
          value={formatBRL(summary?.balance ?? 0)}
          icon={Wallet}
          color={(summary?.balance ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'}
        />
        <StatCard
          title="Total em metas"
          value={formatBRL(totalSavings)}
          icon={Target}
          color="text-primary"
          trendLabel={`${goals.filter((g) => g.status === 'active').length} meta(s) ativa(s)`}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent transactions */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Transações recentes</h2>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/transactions">
                Ver todas <ArrowRight className="ml-1 size-3" />
              </Link>
            </Button>
          </div>
          {txLoading ? (
            <LoadingSpinner />
          ) : recentTx.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                Nenhuma transação ainda.{' '}
                <Link
                  to="/transactions"
                  className="text-primary underline-offset-4 hover:underline"
                >
                  Criar transação
                </Link>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="pt-4 divide-y">
                {recentTx.map((tx) => (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {tx.categories ? (
                        <span
                          className="size-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: tx.categories.color }}
                        />
                      ) : (
                        <span className="size-2.5 shrink-0 rounded-full bg-muted" />
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{tx.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(tx.date), 'dd/MM', { locale: ptBR })}
                          {tx.categories && ` · ${tx.categories.name}`}
                        </p>
                      </div>
                    </div>
                    <AmountDisplay value={tx.amount} type={tx.type as 'income' | 'expense'} />
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* Upcoming bills */}
          {upcomingBills.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold">Contas próximas</h2>
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/bills">
                    Ver todas <ArrowRight className="ml-1 size-3" />
                  </Link>
                </Button>
              </div>
              <Card>
                <CardContent className="pt-4 divide-y">
                  {upcomingBills.map((bill) => {
                    const days = getDaysUntilDue(bill.due_day)
                    return (
                      <div
                        key={bill.id}
                        className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
                      >
                        <div className="flex items-center gap-2">
                          <Clock className="size-3.5 text-amber-500 shrink-0" />
                          <div>
                            <p className="text-sm font-medium">{bill.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {days === 0 ? 'Vence hoje' : `Em ${days} dia${days > 1 ? 's' : ''}`}
                            </p>
                          </div>
                        </div>
                        <span className="text-sm font-semibold">{formatBRL(bill.amount)}</span>
                      </div>
                    )
                  })}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Budget alerts */}
          {overBudget.length > 0 && (
            <div className="space-y-3">
              <h2 className="flex items-center gap-1.5 text-sm font-semibold text-red-600">
                <AlertTriangle className="size-4" />
                Orçamentos excedidos
              </h2>
              <Card className="border-red-200 dark:border-red-800">
                <CardContent className="pt-4 divide-y">
                  {overBudget.map((b) => {
                    const spent = spending[b.category_id] ?? 0
                    return (
                      <div key={b.id} className="py-3 first:pt-0 last:pb-0">
                        <div className="flex justify-between mb-1">
                          <span className="text-sm">
                            {(b as { categories: { name: string } | null }).categories?.name}
                          </span>
                          <span className="text-xs text-red-600">
                            {formatBRL(spent - b.limit_amount)} a mais
                          </span>
                        </div>
                        <Progress
                          value={Math.min((spent / b.limit_amount) * 100, 100)}
                          className="h-1.5 [&>div]:bg-red-500"
                        />
                      </div>
                    )
                  })}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Goals progress */}
          {activeGoals.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold">Metas ativas</h2>
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/goals">
                    Ver todas <ArrowRight className="ml-1 size-3" />
                  </Link>
                </Button>
              </div>
              <Card>
                <CardContent className="pt-4 divide-y">
                  {activeGoals.map((goal) => {
                    const pct =
                      goal.target_amount > 0
                        ? Math.min((goal.current_amount / goal.target_amount) * 100, 100)
                        : 0
                    return (
                      <div key={goal.id} className="py-3 first:pt-0 last:pb-0 space-y-1.5">
                        <div className="flex justify-between">
                          <div className="flex items-center gap-2">
                            <span
                              className="size-2.5 rounded-full"
                              style={{ backgroundColor: goal.color }}
                            />
                            <span className="text-sm font-medium truncate max-w-32">
                              {goal.name}
                            </span>
                          </div>
                          <span className="text-xs text-muted-foreground">{Math.round(pct)}%</span>
                        </div>
                        <Progress value={pct} className="h-1.5" />
                        <p className="text-xs text-muted-foreground">
                          {formatBRL(goal.current_amount)} / {formatBRL(goal.target_amount)}
                        </p>
                      </div>
                    )
                  })}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
