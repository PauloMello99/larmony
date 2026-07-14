"use client"

import * as React from "react"
import { useTranslation } from "react-i18next"
import {
  Building2,
  Ban,
  Users,
  ShieldCheck,
  Network,
  TrendingUp,
  CreditCard,
  Clock,
  AlertTriangle,
  Gift,
  DollarSign,
  ExternalLink,
} from "lucide-react"
import {
  Area,
  AreaChart,
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
import {
  useAdminStats,
  useAdminGrowth,
  useAdminBillingStats,
  useAdminBillingGrowth,
} from "../hooks/use-admin"
import { fmtMonth } from "../lib/format"
import { formatCentsToBRL } from "@/shared/lib/currency"
import { usePrefersReducedMotion } from "@/shared/lib/use-prefers-reduced-motion"

const COLORS = {
  households: "var(--chart-1)",
  users: "#60a5fa", // blue-400
  active: "#22c55e", // green-500
  suspended: "#ef4444", // red-500
  axis: "rgba(255,255,255,0.4)",
  grid: "rgba(255,255,255,0.06)",
}

function StatCard({
  label,
  value,
  icon: Icon,
  loading,
}: {
  label: string
  value: number | string
  icon: typeof Building2
  loading: boolean
}) {
  return (
    <div className="rounded-xl border border-foreground/[0.07] bg-foreground/[0.03] p-4">
      <div className="flex items-center gap-1.5 text-xs text-foreground/50">
        <Icon className="h-3.5 w-3.5 text-primary" />
        {label}
      </div>
      {loading ? (
        <div className="mt-2 h-7 w-12 animate-pulse rounded bg-foreground/[0.06]" />
      ) : (
        <p className="mt-1.5 text-2xl font-semibold tabular-nums text-foreground">
          {value}
        </p>
      )}
    </div>
  )
}

/** Tooltip escuro consistente com o tema (o padrão do recharts é claro). */
function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: { name?: string; value?: number; color?: string }[]
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-foreground/10 bg-popover px-3 py-2 text-xs shadow-xl">
      {label && <p className="mb-1 font-medium text-foreground">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} className="flex items-center gap-1.5 text-foreground/70">
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ backgroundColor: p.color }}
          />
          {p.name}: <span className="tabular-nums text-foreground">{p.value}</span>
        </p>
      ))}
    </div>
  )
}

const PLAN_COLORS: Record<string, string> = {
  free: "rgba(255,255,255,0.35)",
  trial: "#fb923c", // orange-400
  standard: "#22c55e", // emerald-500
  custom: "#38bdf8", // sky-400
}

export function AdminOverview() {
  const { t } = useTranslation("admin")
  const { stats, loading, error } = useAdminStats()
  const { series, loading: growthLoading } = useAdminGrowth()
  const { stats: billing, loading: billingLoading, error: billingError } = useAdminBillingStats()
  const { series: billingSeries, loading: billingGrowthLoading } = useAdminBillingGrowth()
  const reducedMotion = usePrefersReducedMotion()

  const seriesHouseholdsLabel = t("overview.seriesHouseholds")
  const seriesUsersLabel = t("overview.seriesUsers")
  const growthData = series.map((p) => ({
    month: fmtMonth(p.month, t),
    [seriesHouseholdsLabel]: p.newHouseholds,
    [seriesUsersLabel]: p.newUsers,
  }))
  const hasGrowth = series.some((p) => p.newHouseholds > 0 || p.newUsers > 0)

  const activeHouseholds = (stats?.totalHouseholds ?? 0) - (stats?.suspendedHouseholds ?? 0)
  const statusData = [
    { name: t("overview.statusActive"), value: activeHouseholds, color: COLORS.active },
    { name: t("overview.statusSuspended"), value: stats?.suspendedHouseholds ?? 0, color: COLORS.suspended },
  ]
  const hasHouseholds = (stats?.totalHouseholds ?? 0) > 0

  const seriesNewLabel = t("overview.billingSeriesNew")
  const seriesCanceledLabel = t("overview.billingSeriesCanceled")
  const billingGrowthData = billingSeries.map((p) => ({
    month: fmtMonth(p.month, t),
    [seriesNewLabel]: p.newSubscriptions,
    [seriesCanceledLabel]: p.canceledSubscriptions,
  }))
  const hasBillingGrowth = billingSeries.some(
    (p) => p.newSubscriptions > 0 || p.canceledSubscriptions > 0,
  )

  const planData = (billing?.planDistribution ?? []).map((p) => ({
    // Os 4 valores possíveis (free/trial/standard/custom) já têm chave em
    // households.plan_* (PR1) — não precisa de fallback.
    name: t(`households.plan_${p.plan}`),
    value: p.count,
    color: PLAN_COLORS[p.plan] ?? COLORS.axis,
  }))
  const hasPlanData = planData.some((p) => p.value > 0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">
          {t("overview.title")}
        </h1>
        <p className="mt-0.5 text-sm text-foreground/40">
          {t("overview.subtitle")}
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard label={t("overview.statHouseholds")} value={stats?.totalHouseholds ?? 0} icon={Building2} loading={loading} />
        <StatCard label={t("overview.statSuspended")} value={stats?.suspendedHouseholds ?? 0} icon={Ban} loading={loading} />
        <StatCard label={t("overview.statUsers")} value={stats?.totalUsers ?? 0} icon={Users} loading={loading} />
        <StatCard label={t("overview.statSuperAdmins")} value={stats?.superAdmins ?? 0} icon={ShieldCheck} loading={loading} />
        <StatCard label={t("overview.statMemberships")} value={stats?.totalMemberships ?? 0} icon={Network} loading={loading} />
      </div>

      {/* KPIs de billing (M15 PR2) */}
      {billingError && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
          {billingError}
        </div>
      )}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard label={t("overview.statPayingActive")} value={billing?.payingActive ?? 0} icon={CreditCard} loading={billingLoading} />
        <StatCard label={t("overview.statTrialing")} value={billing?.trialing ?? 0} icon={Clock} loading={billingLoading} />
        <StatCard label={t("overview.statPastDue")} value={billing?.pastDue ?? 0} icon={AlertTriangle} loading={billingLoading} />
        <StatCard label={t("overview.statComp")} value={billing?.comp ?? 0} icon={Gift} loading={billingLoading} />
        <StatCard
          label={t("overview.statApproxMrr")}
          value={billing ? formatCentsToBRL(billing.approxMrrCents) : "—"}
          icon={DollarSign}
          loading={billingLoading}
        />
      </div>

      {/* Receita real (espelho de invoices, M15 PR2 commit 3) */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard
          label={t("overview.statRevenue30d")}
          value={billing ? formatCentsToBRL(billing.revenueCents30d) : "—"}
          icon={DollarSign}
          loading={billingLoading}
        />
        <StatCard
          label={t("overview.statFailedPayments30d")}
          value={billing?.failedPayments30d ?? 0}
          icon={AlertTriangle}
          loading={billingLoading}
        />
        <a
          href="https://dashboard.stripe.com/payments"
          target="_blank"
          rel="noreferrer"
          className="col-span-2 flex items-center gap-1.5 rounded-xl border border-foreground/[0.07] bg-foreground/[0.03] p-4 text-sm text-foreground/50 transition-colors hover:text-foreground sm:col-span-1"
        >
          <ExternalLink className="h-3.5 w-3.5 text-primary" />
          {t("overview.viewRevenueInStripe")}
        </a>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Distribuição de planos + novas/canceladas (billing) */}
        <div className="rounded-xl border border-foreground/[0.07] bg-foreground/[0.03] p-4">
          <div className="mb-3 flex items-center gap-1.5 text-sm font-medium text-foreground">
            <CreditCard className="h-4 w-4 text-primary" />
            {t("overview.planDistributionTitle")}
          </div>
          {billingLoading ? (
            <div className="h-64 animate-pulse rounded-lg bg-foreground/[0.04]" />
          ) : hasPlanData ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={planData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={2}
                    isAnimationActive={!reducedMotion}
                  >
                    {planData.map((d) => (
                      <Cell key={d.name} fill={d.color} stroke="transparent" />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex h-64 items-center justify-center text-sm text-foreground/40">
              {t("overview.planDistributionEmpty")}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-foreground/[0.07] bg-foreground/[0.03] p-4 lg:col-span-2">
          <div className="mb-3 flex items-center gap-1.5 text-sm font-medium text-foreground">
            <TrendingUp className="h-4 w-4 text-primary" />
            {t("overview.billingGrowthTitle")}
          </div>
          {billingGrowthLoading ? (
            <div className="h-64 animate-pulse rounded-lg bg-foreground/[0.04]" />
          ) : hasBillingGrowth ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={billingGrowthData} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
                  <defs>
                    <linearGradient id="gNewSubs" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={COLORS.active} stopOpacity={0.35} />
                      <stop offset="100%" stopColor={COLORS.active} stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gCanceledSubs" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={COLORS.suspended} stopOpacity={0.35} />
                      <stop offset="100%" stopColor={COLORS.suspended} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke={COLORS.grid} vertical={false} />
                  <XAxis dataKey="month" tick={{ fill: COLORS.axis, fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis allowDecimals={false} tick={{ fill: COLORS.axis, fontSize: 11 }} tickLine={false} axisLine={false} width={32} />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Area type="monotone" dataKey={seriesNewLabel} stroke={COLORS.active} fill="url(#gNewSubs)" strokeWidth={2} isAnimationActive={!reducedMotion} />
                  <Area type="monotone" dataKey={seriesCanceledLabel} stroke={COLORS.suspended} fill="url(#gCanceledSubs)" strokeWidth={2} isAnimationActive={!reducedMotion} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex h-64 items-center justify-center text-sm text-foreground/40">
              {t("overview.billingGrowthEmpty")}
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Crescimento (últimos 12 meses) */}
        <div className="rounded-xl border border-foreground/[0.07] bg-foreground/[0.03] p-4 lg:col-span-2">
          <div className="mb-3 flex items-center gap-1.5 text-sm font-medium text-foreground">
            <TrendingUp className="h-4 w-4 text-primary" />
            {t("overview.growthTitle")}
          </div>
          {growthLoading ? (
            <div className="h-64 animate-pulse rounded-lg bg-foreground/[0.04]" />
          ) : hasGrowth ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={growthData} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
                  <defs>
                    <linearGradient id="gHouseholds" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={COLORS.households} stopOpacity={0.35} />
                      <stop offset="100%" stopColor={COLORS.households} stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gUsers" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={COLORS.users} stopOpacity={0.35} />
                      <stop offset="100%" stopColor={COLORS.users} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke={COLORS.grid} vertical={false} />
                  <XAxis dataKey="month" tick={{ fill: COLORS.axis, fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis allowDecimals={false} tick={{ fill: COLORS.axis, fontSize: 11 }} tickLine={false} axisLine={false} width={32} />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Area type="monotone" dataKey={seriesHouseholdsLabel} stroke={COLORS.households} fill="url(#gHouseholds)" strokeWidth={2} isAnimationActive={!reducedMotion} />
                  <Area type="monotone" dataKey={seriesUsersLabel} stroke={COLORS.users} fill="url(#gUsers)" strokeWidth={2} isAnimationActive={!reducedMotion} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex h-64 items-center justify-center text-sm text-foreground/40">
              {t("overview.growthEmpty")}
            </div>
          )}
        </div>

        {/* Lares por status */}
        <div className="rounded-xl border border-foreground/[0.07] bg-foreground/[0.03] p-4">
          <div className="mb-3 flex items-center gap-1.5 text-sm font-medium text-foreground">
            <Building2 className="h-4 w-4 text-primary" />
            {t("overview.statusTitle")}
          </div>
          {loading ? (
            <div className="h-64 animate-pulse rounded-lg bg-foreground/[0.04]" />
          ) : hasHouseholds ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={2}
                    isAnimationActive={!reducedMotion}
                  >
                    {statusData.map((d) => (
                      <Cell key={d.name} fill={d.color} stroke="transparent" />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex h-64 items-center justify-center text-sm text-foreground/40">
              {t("overview.statusEmpty")}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
