"use client"

import * as React from "react"
import { useTranslation } from "react-i18next"
import { Home, UserPlus, LineChart, Users, Coins, ShieldCheck } from "lucide-react"
import { SectionHeading } from "./section-heading"
import { Reveal } from "./reveal"

const DELAYS = ["", "lp-d1", "lp-d2"]

const STEPS = [
  { key: "s1", icon: Home },
  { key: "s2", icon: UserPlus },
  { key: "s3", icon: LineChart },
]

const DIFFS = [
  { key: "d1", icon: Users },
  { key: "d2", icon: Coins },
  { key: "d3", icon: ShieldCheck },
]

export function About() {
  const { t } = useTranslation("landing")

  return (
    <section id="sobre" className="py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <SectionHeading
          kicker={t("about.kicker")}
          title={t("about.title")}
          subtitle={t("about.subtitle")}
        />

        {/* Como funciona — 3 passos */}
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {STEPS.map((step, i) => {
            const Icon = step.icon
            return (
              <Reveal
                key={step.key}
                delay={DELAYS[i]}
                className="relative overflow-hidden rounded-[20px] border border-white/[0.07] bg-white/[0.03] p-7"
              >
                <span className="pointer-events-none absolute right-5 top-3 text-[56px] font-black leading-none text-white/[0.05]">
                  {i + 1}
                </span>
                <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-[13px] bg-primary/10">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="mb-2 text-[16.5px] font-semibold text-white">
                  {t(`about.steps.${step.key}.title`)}
                </h3>
                <p className="text-sm leading-relaxed text-white/55">
                  {t(`about.steps.${step.key}.desc`)}
                </p>
              </Reveal>
            )
          })}
        </div>

        {/* Diferenciais */}
        <div className="mt-20">
          <h3 className="text-center text-[22px] font-bold tracking-tight text-white sm:text-[26px]">
            {t("about.diff.title")}
          </h3>
          <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-3">
            {DIFFS.map((d, i) => {
              const Icon = d.icon
              return (
                <Reveal
                  key={d.key}
                  delay={DELAYS[i]}
                  className="rounded-[20px] border border-white/[0.07] bg-white/[0.03] p-6 transition-colors hover:border-primary/30"
                >
                  <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <h4 className="mb-1.5 text-[15px] font-semibold text-white">
                    {t(`about.diff.${d.key}.title`)}
                  </h4>
                  <p className="text-[13.5px] leading-relaxed text-white/55">
                    {t(`about.diff.${d.key}.desc`)}
                  </p>
                </Reveal>
              )
            })}
          </div>
        </div>

        {/* Prova / resultado */}
        <Reveal className="mt-20 rounded-3xl border border-primary/20 bg-primary/[0.06] p-10 text-center sm:p-12">
          <h3 className="mx-auto max-w-2xl text-[22px] font-bold leading-snug tracking-tight text-white sm:text-[28px]">
            {t("about.proof.title")}
          </h3>
          <p className="mx-auto mt-3.5 max-w-xl text-[15px] leading-relaxed text-white/60">
            {t("about.proof.description")}
          </p>
        </Reveal>
      </div>
    </section>
  )
}
