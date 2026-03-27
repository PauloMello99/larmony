import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  format,
  subMonths,
  addMonths,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import { supabase } from '@/services/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useCategories } from '@/queries/categories'
import { useMembers } from '@/queries/members'
import { formatBRL } from '@/lib/currency'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { LoadingSpinner } from '@/components/atoms/LoadingSpinner'

type ViewMode = 'monthly' | 'annual'

// ── Hooks ────────────────────────────────────────────────────────────────────

function useLast6MonthsBar(year: number) {
  const { householdId } = useAuth()
  return useQuery({
    queryKey: ['report-6m', householdId, year],
    queryFn: async () => {
      if (!householdId) return []
      const months = Array.from({ length: 6 }, (_, i) => subMonths(new Date(), 5 - i))
      const results = await Promise.all(
        months.map(async (d) => {
          const from = format(startOfMonth(d), 'yyyy-MM-dd')
          const to = format(endOfMonth(d), 'yyyy-MM-dd')
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
          return { month: format(d, 'MMM', { locale: ptBR }), Receitas: income, Despesas: expense }
        })
      )
      return results
    },
    enabled: !!householdId,
  })
}

function useAnnualBar(year: number) {
  const { householdId } = useAuth()
  return useQuery({
    queryKey: ['report-annual', householdId, year],
    queryFn: async () => {
      if (!householdId) return []
      const months = Array.from({ length: 12 }, (_, i) => new Date(year, i, 1))
      const results = await Promise.all(
        months.map(async (d) => {
          const from = format(startOfMonth(d), 'yyyy-MM-dd')
          const to = format(endOfMonth(d), 'yyyy-MM-dd')
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
          return { month: format(d, 'MMM', { locale: ptBR }), Receitas: income, Despesas: expense }
        })
      )
      return results
    },
    enabled: !!householdId,
  })
}

function useAnnualSummary(year: number) {
  const { householdId } = useAuth()
  return useQuery({
    queryKey: ['report-annual-summary', householdId, year],
    queryFn: async () => {
      if (!householdId) return { income: 0, expense: 0, balance: 0 }
      const from = format(startOfYear(new Date(year, 0, 1)), 'yyyy-MM-dd')
      const to = format(endOfYear(new Date(year, 0, 1)), 'yyyy-MM-dd')
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
      return { income, expense, balance: income - expense }
    },
    enabled: !!householdId,
  })
}

function useCategoryPie(month: number, year: number, viewMode: ViewMode) {
  const { householdId } = useAuth()
  const { data: categories = [] } = useCategories()
  return useQuery({
    queryKey: ['report-category-pie', householdId, month, year, viewMode],
    queryFn: async () => {
      if (!householdId) return []
      const from =
        viewMode === 'annual'
          ? format(new Date(year, 0, 1), 'yyyy-MM-dd')
          : format(new Date(year, month - 1, 1), 'yyyy-MM-dd')
      const to =
        viewMode === 'annual'
          ? format(new Date(year, 11, 31), 'yyyy-MM-dd')
          : format(new Date(year, month, 0), 'yyyy-MM-dd')
      const { data } = await supabase
        .from('transactions')
        .select('category_id, amount')
        .eq('household_id', householdId)
        .eq('type', 'expense')
        .gte('date', from)
        .lte('date', to)
        .not('category_id', 'is', null)
      const totals: Record<string, number> = {}
      for (const t of data ?? []) {
        if (t.category_id) totals[t.category_id] = (totals[t.category_id] ?? 0) + t.amount
      }
      return Object.entries(totals)
        .map(([id, value]) => {
          const cat = categories.find((c) => c.id === id)
          return { name: cat?.name ?? 'Outros', value, color: cat?.color ?? '#6b7280' }
        })
        .sort((a, b) => b.value - a.value)
    },
    enabled: !!householdId && categories.length > 0,
  })
}

function usePersonSpending(month: number, year: number, viewMode: ViewMode) {
  const { householdId } = useAuth()
  const { data: members = [] } = useMembers()
  return useQuery({
    queryKey: ['report-person', householdId, month, year, viewMode],
    queryFn: async () => {
      if (!householdId || members.length === 0) return []
      const from =
        viewMode === 'annual'
          ? format(new Date(year, 0, 1), 'yyyy-MM-dd')
          : format(new Date(year, month - 1, 1), 'yyyy-MM-dd')
      const to =
        viewMode === 'annual'
          ? format(new Date(year, 11, 31), 'yyyy-MM-dd')
          : format(new Date(year, month, 0), 'yyyy-MM-dd')
      const { data } = await supabase
        .from('transactions')
        .select('person_id, amount, type')
        .eq('household_id', householdId)
        .gte('date', from)
        .lte('date', to)
        .not('person_id', 'is', null)
      const byPerson: Record<string, { income: number; expense: number }> = {}
      for (const t of data ?? []) {
        const pid = t.person_id as string
        if (!byPerson[pid]) byPerson[pid] = { income: 0, expense: 0 }
        if (t.type === 'income') byPerson[pid].income += t.amount
        else byPerson[pid].expense += t.amount
      }
      return members
        .filter((m) => byPerson[m.user_id])
        .map((m) => ({
          name: m.full_name ?? 'Membro',
          income: byPerson[m.user_id]?.income ?? 0,
          expense: byPerson[m.user_id]?.expense ?? 0,
        }))
    },
    enabled: !!householdId && members.length > 0,
  })
}

// ── Pie label ────────────────────────────────────────────────────────────────

const RADIAN = Math.PI / 180
function CustomPieLabel({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  percent,
}: {
  cx: number
  cy: number
  midAngle: number
  innerRadius: number
  outerRadius: number
  percent: number
}) {
  if (percent < 0.05) return null
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5
  const x = cx + radius * Math.cos(-midAngle * RADIAN)
  const y = cy + radius * Math.sin(-midAngle * RADIAN)
  return (
    <text
      x={x}
      y={y}
      fill="white"
      textAnchor="middle"
      dominantBaseline="central"
      className="text-xs font-medium"
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const today = new Date()
  const [viewMode, setViewMode] = useState<ViewMode>('monthly')
  const [currentDate, setCurrentDate] = useState(today)
  const [currentYear, setCurrentYear] = useState(today.getFullYear())

  const month = currentDate.getMonth() + 1
  const year = viewMode === 'annual' ? currentYear : currentDate.getFullYear()

  const { data: barDataMonthly = [], isLoading: barLoadingMonthly } = useLast6MonthsBar(year)
  const { data: barDataAnnual = [], isLoading: barLoadingAnnual } = useAnnualBar(currentYear)
  const { data: annualSummary } = useAnnualSummary(currentYear)
  const { data: pieData = [], isLoading: pieLoading } = useCategoryPie(month, year, viewMode)
  const { data: personData = [], isLoading: personLoading } = usePersonSpending(
    month,
    year,
    viewMode
  )

  const barData = viewMode === 'annual' ? barDataAnnual : barDataMonthly
  const barLoading = viewMode === 'annual' ? barLoadingAnnual : barLoadingMonthly
  const totalExpense = pieData.reduce((s, d) => s + d.value, 0)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Relatórios</h1>
          <p className="text-sm text-muted-foreground">Análise financeira do seu lar</p>
        </div>

        {/* View mode toggle */}
        <div className="flex rounded-md border overflow-hidden">
          <button
            className={`px-4 py-1.5 text-sm font-medium transition-colors ${
              viewMode === 'monthly' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
            }`}
            onClick={() => setViewMode('monthly')}
          >
            Mensal
          </button>
          <button
            className={`px-4 py-1.5 text-sm font-medium transition-colors ${
              viewMode === 'annual' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
            }`}
            onClick={() => setViewMode('annual')}
          >
            Anual
          </button>
        </div>
      </div>

      {/* Period navigation */}
      {viewMode === 'monthly' ? (
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentDate((d) => subMonths(d, 1))}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <span className="min-w-36 text-center text-sm font-medium capitalize">
            {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
          </span>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentDate((d) => addMonths(d, 1))}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={() => setCurrentYear((y) => y - 1)}>
            <ChevronLeft className="size-4" />
          </Button>
          <span className="min-w-20 text-center text-sm font-medium">{currentYear}</span>
          <Button variant="outline" size="icon" onClick={() => setCurrentYear((y) => y + 1)}>
            <ChevronRight className="size-4" />
          </Button>
        </div>
      )}

      {/* Annual summary cards */}
      {viewMode === 'annual' && annualSummary && (
        <div className="grid sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">Receitas {currentYear}</p>
              <p className="text-xl font-bold text-green-600">{formatBRL(annualSummary.income)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">Despesas {currentYear}</p>
              <p className="text-xl font-bold text-red-600">{formatBRL(annualSummary.expense)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">Saldo {currentYear}</p>
              <p
                className={`text-xl font-bold ${annualSummary.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}
              >
                {formatBRL(annualSummary.balance)}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Bar chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {viewMode === 'annual'
              ? `Receitas vs Despesas — ${currentYear}`
              : 'Receitas vs Despesas — últimos 6 meses'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {barLoading ? (
            <LoadingSpinner />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={barData} margin={{ top: 4, right: 4, left: 0, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  formatter={(value: number) => formatBRL(value)}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="Receitas" fill="#22c55e" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Despesas" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Category pie */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Despesas por categoria
              {viewMode === 'monthly' && (
                <span className="text-muted-foreground font-normal text-sm ml-1">
                  — {format(currentDate, 'MMMM', { locale: ptBR })}
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pieLoading ? (
              <LoadingSpinner />
            ) : pieData.length === 0 ? (
              <div className="flex h-48 items-center justify-center">
                <p className="text-sm text-muted-foreground">
                  Nenhuma despesa com categoria no período
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      outerRadius={90}
                      dataKey="value"
                      labelLine={false}
                      label={CustomPieLabel as unknown as boolean}
                    >
                      {pieData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => formatBRL(value)}
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2">
                  {pieData.map((d) => (
                    <div key={d.name} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span
                          className="size-3 rounded-full"
                          style={{ backgroundColor: d.color }}
                        />
                        <span>{d.name}</span>
                      </div>
                      <div className="flex items-center gap-3 text-muted-foreground">
                        <span>
                          {totalExpense > 0
                            ? `${((d.value / totalExpense) * 100).toFixed(1)}%`
                            : '—'}
                        </span>
                        <span className="font-medium text-foreground w-24 text-right">
                          {formatBRL(d.value)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Per-person spending — now uses person_id */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Gastos por pessoa</CardTitle>
          </CardHeader>
          <CardContent>
            {personLoading ? (
              <LoadingSpinner />
            ) : personData.length === 0 ? (
              <div className="flex h-48 items-center justify-center text-center">
                <p className="text-sm text-muted-foreground">
                  Nenhum dado disponível.
                  <br />
                  <span className="text-xs">
                    Atribua transações a pessoas no formulário de lançamento.
                  </span>
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Pessoa</TableHead>
                    <TableHead className="text-right">Receitas</TableHead>
                    <TableHead className="text-right">Despesas</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {personData.map((p) => (
                    <TableRow key={p.name}>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell className="text-right text-green-600">
                        {formatBRL(p.income)}
                      </TableCell>
                      <TableCell className="text-right text-red-600">
                        {formatBRL(p.expense)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
