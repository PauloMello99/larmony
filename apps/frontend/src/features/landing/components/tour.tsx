"use client"

import * as React from "react"
import { useTranslation } from "react-i18next"
import {
  LayoutDashboard,
  ArrowLeftRight,
  PieChart,
  PiggyBank,
  Target,
  Bell,
} from "lucide-react"
import { cn } from "@/shared/lib/utils"
import { SectionHeading } from "./section-heading"
import { Reveal } from "./reveal"

const TABS = [
  { key: "overview", icon: LayoutDashboard },
  { key: "transactions", icon: ArrowLeftRight },
  { key: "categories", icon: PieChart },
  { key: "budgets", icon: PiggyBank },
  { key: "goals", icon: Target },
  { key: "bills", icon: Bell },
] as const

type TabKey = (typeof TABS)[number]["key"]

type T = ReturnType<typeof useTranslation>["t"]

/** Barra de progresso simples (categorias/orçamentos/metas). */
function Bar({ pct, tone = "primary" }: { pct: number; tone?: "primary" | "success" | "destructive" }) {
  const bar =
    tone === "success" ? "bg-success" : tone === "destructive" ? "bg-destructive" : "bg-primary"
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.08]">
      <div className={cn("h-full rounded-full", bar)} style={{ width: `${Math.min(pct, 100)}%` }} />
    </div>
  )
}

function Kpi({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
      <div className="mb-1.5 text-[11px] text-white/35">{label}</div>
      <div className={cn("text-xl font-bold sm:text-[21px]", tone)}>{value}</div>
    </div>
  )
}

function OverviewPanel({ t }: { t: T }) {
  const rows = [
    { key: "r1", who: "Ana", amount: "+R$ 6.200,00", swatch: "bg-success", value: "text-success" },
    { key: "r2", who: "Paulo", amount: "-R$ 342,10", swatch: "bg-destructive", value: "text-destructive" },
    { key: "r3", who: "Ana", amount: "-R$ 1.850,00", swatch: "bg-destructive", value: "text-destructive" },
  ]
  return (
    <>
      <div className="mb-4 text-[15px] font-semibold">{t("tour.overview.greeting")}</div>
      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Kpi label={t("tour.overview.kpis.income")} value="R$ 6.200" tone="text-success" />
        <Kpi label={t("tour.overview.kpis.expenses")} value="R$ 2.231" tone="text-destructive" />
        <Kpi label={t("tour.overview.kpis.balance")} value="R$ 3.969" tone="text-primary" />
      </div>
      <div className="rounded-xl border border-white/[0.07] bg-white/[0.02]">
        {rows.map((row, i) => (
          <div
            key={row.key}
            className={cn(
              "flex items-center gap-3 px-4 py-3 text-[13px]",
              i < rows.length - 1 && "border-b border-white/[0.07]",
            )}
          >
            <span className={cn("h-2 w-2 shrink-0 rounded-full", row.swatch)} />
            <span className="text-white/80">{t(`tour.overview.rows.${row.key}`)}</span>
            <span className="ml-auto mr-3 text-[12px] text-white/35">{row.who}</span>
            <strong className={row.value}>{row.amount}</strong>
          </div>
        ))}
      </div>
    </>
  )
}

function TransactionsPanel({ t }: { t: T }) {
  const rows = [
    { key: "r1", amount: "-R$ 342,10", value: "text-destructive", split: true },
    { key: "r2", amount: "-R$ 89,90", value: "text-destructive", split: false },
    { key: "r3", amount: "+R$ 6.200,00", value: "text-success", split: false },
    { key: "r4", amount: "-R$ 1.850,00", value: "text-destructive", split: true },
  ]
  return (
    <>
      <div className="mb-4 text-[15px] font-semibold">{t("tour.transactions.title")}</div>
      <div className="rounded-xl border border-white/[0.07] bg-white/[0.02]">
        {rows.map((row, i) => (
          <div
            key={row.key}
            className={cn(
              "flex items-center gap-3 px-4 py-3 text-[13px]",
              i < rows.length - 1 && "border-b border-white/[0.07]",
            )}
          >
            <span className="text-white/80">{t(`tour.transactions.rows.${row.key}`)}</span>
            {row.split && (
              <span className="rounded-full bg-primary/12 px-2 py-0.5 text-[10.5px] font-medium text-primary">
                {t("tour.transactions.splitBadge")}
              </span>
            )}
            <strong className={cn("ml-auto", row.value)}>{row.amount}</strong>
          </div>
        ))}
      </div>
    </>
  )
}

function CategoriesPanel({ t }: { t: T }) {
  const items = [
    { key: "c1", amount: "R$ 1.850", pct: 62, tone: "primary" as const },
    { key: "c2", amount: "R$ 742", pct: 25, tone: "primary" as const },
    { key: "c3", amount: "R$ 268", pct: 9, tone: "primary" as const },
    { key: "c4", amount: "R$ 121", pct: 4, tone: "primary" as const },
  ]
  return (
    <>
      <div className="mb-4 text-[15px] font-semibold">{t("tour.categories.title")}</div>
      <div className="space-y-4">
        {items.map((item) => (
          <div key={item.key}>
            <div className="mb-1.5 flex items-center justify-between text-[13px]">
              <span className="text-white/80">{t(`tour.categories.items.${item.key}`)}</span>
              <span className="text-white/50">{item.amount}</span>
            </div>
            <Bar pct={item.pct} tone={item.tone} />
          </div>
        ))}
      </div>
    </>
  )
}

function BudgetsPanel({ t }: { t: T }) {
  const items = [
    { key: "b1", spent: "R$ 1.850", limit: "R$ 2.000", pct: 92, tone: "success" as const },
    { key: "b2", spent: "R$ 742", limit: "R$ 600", pct: 100, tone: "destructive" as const },
    { key: "b3", spent: "R$ 268", limit: "R$ 500", pct: 54, tone: "success" as const },
  ]
  return (
    <>
      <div className="mb-4 text-[15px] font-semibold">{t("tour.budgets.title")}</div>
      <div className="space-y-4">
        {items.map((item) => (
          <div key={item.key}>
            <div className="mb-1.5 flex items-center justify-between text-[13px]">
              <span className="text-white/80">{t(`tour.budgets.items.${item.key}`)}</span>
              <span className={item.tone === "destructive" ? "text-destructive" : "text-white/50"}>
                {item.spent} / {item.limit}
              </span>
            </div>
            <Bar pct={item.pct} tone={item.tone} />
          </div>
        ))}
      </div>
    </>
  )
}

function GoalsPanel({ t }: { t: T }) {
  const items = [
    { key: "g1", saved: "R$ 4.200", target: "R$ 8.000", pct: 52 },
    { key: "g2", saved: "R$ 1.100", target: "R$ 2.000", pct: 55 },
  ]
  return (
    <>
      <div className="mb-4 text-[15px] font-semibold">{t("tour.goals.title")}</div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {items.map((item) => (
          <div key={item.key} className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
            <div className="mb-1 text-[13px] text-white/80">{t(`tour.goals.items.${item.key}`)}</div>
            <div className="mb-3 text-[12px] text-white/40">
              {item.saved} / {item.target}
            </div>
            <Bar pct={item.pct} tone="primary" />
            <div className="mt-2 text-right text-[12px] font-semibold text-primary">{item.pct}%</div>
          </div>
        ))}
      </div>
    </>
  )
}

function BillsPanel({ t }: { t: T }) {
  const items = [
    { key: "b1", amount: "R$ 1.850,00", accent: "text-destructive" },
    { key: "b2", amount: "R$ 129,90", accent: "text-white/70" },
    { key: "b3", amount: "R$ 89,90", accent: "text-white/70" },
  ]
  return (
    <>
      <div className="mb-4 text-[15px] font-semibold">{t("tour.bills.title")}</div>
      <div className="rounded-xl border border-white/[0.07] bg-white/[0.02]">
        {items.map((item, i) => (
          <div
            key={item.key}
            className={cn(
              "flex items-center gap-3 px-4 py-3 text-[13px]",
              i < items.length - 1 && "border-b border-white/[0.07]",
            )}
          >
            <Bell className="h-3.5 w-3.5 shrink-0 text-primary/70" />
            <span className="text-white/80">{t(`tour.bills.items.${item.key}.label`)}</span>
            <span className="ml-auto mr-3 text-[12px] text-white/35">
              {t(`tour.bills.items.${item.key}.due`)}
            </span>
            <strong className={item.accent}>{item.amount}</strong>
          </div>
        ))}
      </div>
    </>
  )
}

const PANELS: Record<TabKey, (props: { t: T }) => React.JSX.Element> = {
  overview: OverviewPanel,
  transactions: TransactionsPanel,
  categories: CategoriesPanel,
  budgets: BudgetsPanel,
  goals: GoalsPanel,
  bills: BillsPanel,
}

export function Tour() {
  const { t } = useTranslation("landing")
  const [active, setActive] = React.useState<TabKey>("overview")
  const Panel = PANELS[active]

  return (
    <section id="tour" className="relative py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <SectionHeading
          kicker={t("tour.kicker")}
          title={t("tour.title")}
          subtitle={t("tour.subtitle")}
        />

        <Reveal className="rounded-3xl border border-white/[0.09] bg-gradient-to-b from-white/[0.05] to-white/[0.02] p-2.5 shadow-[0_40px_80px_-30px_rgba(0,0,0,0.55)]">
          {/* Tabs horizontais — mobile */}
          <div className="flex gap-1.5 overflow-x-auto rounded-2xl bg-[#101114] p-2 sm:hidden">
            {TABS.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActive(tab.key)}
                  aria-pressed={active === tab.key}
                  className={cn(
                    "flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-[13px] transition-colors",
                    active === tab.key ? "bg-white/[0.08] text-white" : "text-white/40",
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {t(`tour.tabs.${tab.key}`)}
                </button>
              )
            })}
          </div>

          <div className="mt-2 flex min-h-[420px] overflow-hidden rounded-2xl bg-[#101114] sm:mt-0">
            {/* Sidebar — desktop */}
            <aside className="hidden w-52 shrink-0 border-r border-white/[0.07] p-3 sm:block">
              {TABS.map((tab) => {
                const Icon = tab.icon
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActive(tab.key)}
                    aria-pressed={active === tab.key}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-[13px] transition-colors",
                      active === tab.key
                        ? "bg-white/[0.06] text-white"
                        : "text-white/40 hover:bg-white/[0.03] hover:text-white/70",
                    )}
                  >
                    <Icon
                      className={cn(
                        "h-4 w-4 shrink-0",
                        active === tab.key ? "text-primary" : "text-white/30",
                      )}
                    />
                    {t(`tour.tabs.${tab.key}`)}
                  </button>
                )
              })}
            </aside>

            {/* Painel ativo */}
            <div className="flex-1 p-6">
              <Panel t={t} />
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
