"use client"

import * as React from "react"
import { useTranslation } from "react-i18next"
import { Check } from "lucide-react"
import { Reveal } from "./reveal"
import { useCountUp } from "../lib/use-count-up"

const BULLETS = [
  "about.bullets.b1",
  "about.bullets.b2",
  "about.bullets.b3",
  "about.bullets.b4",
]

function StatCard({
  value,
  label,
  delay,
}: {
  value: React.ReactNode
  label: string
  delay?: string
}) {
  return (
    <Reveal
      delay={delay}
      className="rounded-[20px] border border-white/[0.07] bg-white/[0.03] p-6 transition-colors hover:border-primary/30"
    >
      <div className="text-3xl font-extrabold tracking-tight text-primary">
        {value}
      </div>
      <p className="mt-1.5 text-[13.5px] leading-snug text-white/55">{label}</p>
    </Reveal>
  )
}

function PercentStat() {
  const { ref, display } = useCountUp<HTMLSpanElement>(100, { suffix: "%" })
  return (
    <span ref={ref} className="inline-block">
      {display}
    </span>
  )
}

export function About() {
  const { t } = useTranslation("landing")

  return (
    <section id="sobre" className="py-24">
      <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-14 px-4 sm:px-6 lg:grid-cols-2">
        {/* Left: text */}
        <Reveal>
          <span className="text-[12.5px] font-bold uppercase tracking-[0.12em] text-primary">
            {t("about.kicker")}
          </span>
          <h2 className="mt-3 text-[28px] font-bold leading-tight tracking-tight text-white sm:text-4xl md:text-[42px]">
            {t("about.titlePrefix")}{" "}
            <span className="text-primary">{t("about.titleHighlight")}</span>
          </h2>
          <p className="mt-5 text-[15.5px] leading-relaxed text-white/55">
            {t("about.paragraph")}
          </p>

          <ul className="mt-7 space-y-3.5">
            {BULLETS.map((bullet) => (
              <li key={bullet} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15">
                  <Check className="h-3 w-3 text-primary" />
                </span>
                <span className="text-[14.5px] text-white/55">{t(bullet)}</span>
              </li>
            ))}
          </ul>
        </Reveal>

        {/* Right: stats */}
        <div className="grid grid-cols-2 gap-4">
          <StatCard
            value={<PercentStat />}
            label={t("about.stats.cents")}
          />
          <StatCard value="∞" label={t("about.stats.members")} delay="lp-d1" />
          <StatCard value="2" label={t("about.stats.languages")} delay="lp-d2" />
          <StatCard value="RLS" label={t("about.stats.rls")} delay="lp-d3" />
        </div>
      </div>
    </section>
  )
}
