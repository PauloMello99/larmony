"use client"

import * as React from "react"
import { useTranslation } from "react-i18next"
import { cn } from "@/shared/lib/utils"
import { SectionHeading } from "./section-heading"
import { Reveal } from "./reveal"
import { useCountUp } from "../lib/use-count-up"

const SIDE_ITEMS = [
  "tour.sidebar.overview",
  "tour.sidebar.transactions",
  "tour.sidebar.categories",
  "tour.sidebar.budgets",
  "tour.sidebar.goals",
  "tour.sidebar.bills",
]

const ROWS = [
  { key: "r1", swatch: "bg-success", value: "text-success" },
  { key: "r2", swatch: "bg-destructive", value: "text-destructive" },
  { key: "r3", swatch: "bg-destructive", value: "text-destructive" },
]

function Kpi({
  label,
  target,
  className,
}: {
  label: string
  target: number
  className?: string
}) {
  const { ref, display } = useCountUp<HTMLDivElement>(target, {
    prefix: "R$ ",
    decimals: 0,
  })
  return (
    <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
      <div className="mb-1.5 text-[11px] text-white/35">{label}</div>
      <div ref={ref} className={cn("text-xl font-bold sm:text-[21px]", className)}>
        {display}
      </div>
    </div>
  )
}

export function Tour() {
  const { t } = useTranslation("landing")

  return (
    <section id="tour" className="relative py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <SectionHeading
          kicker={t("tour.kicker")}
          title={t("tour.title")}
          subtitle={t("tour.subtitle")}
        />

        <Reveal className="rounded-3xl border border-white/[0.09] bg-gradient-to-b from-white/[0.05] to-white/[0.02] p-2.5 shadow-[0_40px_80px_-30px_rgba(0,0,0,0.55)]">
          <div className="flex min-h-[420px] overflow-hidden rounded-2xl bg-[#101114]">
            {/* Sidebar — desktop only */}
            <aside className="hidden w-48 shrink-0 border-r border-white/[0.07] p-3 sm:block">
              {SIDE_ITEMS.map((item, i) => (
                <div
                  key={item}
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-[13px]",
                    i === 0
                      ? "bg-white/[0.06] text-white"
                      : "text-white/35",
                  )}
                >
                  <span
                    className={cn(
                      "h-1.5 w-1.5 rounded-full",
                      i === 0 ? "bg-primary" : "bg-white/15",
                    )}
                  />
                  {t(item)}
                </div>
              ))}
            </aside>

            {/* Main */}
            <div className="flex-1 p-6">
              <div className="mb-4 text-[15px] font-semibold">
                {t("tour.greeting")}
              </div>

              <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <Kpi label={t("tour.kpis.income")} target={6200} className="text-success" />
                <Kpi label={t("tour.kpis.expenses")} target={2231} className="text-destructive" />
                <Kpi label={t("tour.kpis.balance")} target={3969} className="text-primary" />
              </div>

              <div className="rounded-xl border border-white/[0.07] bg-white/[0.02]">
                {ROWS.map((row, i) => (
                  <div
                    key={row.key}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 text-[13px]",
                      i < ROWS.length - 1 && "border-b border-white/[0.07]",
                    )}
                  >
                    <span className={cn("h-2 w-2 shrink-0 rounded-full", row.swatch)} />
                    <span className="text-white/80">{t(`tour.rows.${row.key}.label`)}</span>
                    <span className="ml-auto mr-3 text-[12px] text-white/35">
                      {t(`tour.rows.${row.key}.who`)}
                    </span>
                    <strong className={row.value}>{t(`tour.rows.${row.key}.amount`)}</strong>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
