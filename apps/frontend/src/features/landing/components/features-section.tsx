import * as React from "react"
import { useTranslation } from "react-i18next"
import {
  ArrowLeftRight,
  Target,
  PiggyBank,
  BarChart3,
  Bell,
  Users,
} from "lucide-react"
import { SectionHeading } from "./section-heading"
import { Reveal } from "./reveal"

const FEATURES = [
  { icon: ArrowLeftRight, key: "transactions" },
  { icon: PiggyBank, key: "budgets" },
  { icon: Target, key: "goals" },
  { icon: BarChart3, key: "dashboard" },
  { icon: Bell, key: "reminders" },
  { icon: Users, key: "household" },
]

const DELAYS = ["", "lp-d1", "lp-d2"]

export function FeaturesSection() {
  const { t } = useTranslation("landing")

  return (
    <section id="recursos" className="py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <SectionHeading
          kicker={t("features.kicker")}
          title={t("features.title")}
          subtitle={t("features.subtitle")}
        />

        <div className="grid grid-cols-1 gap-[18px] sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature, i) => {
            const Icon = feature.icon
            return (
              <Reveal
                key={feature.key}
                delay={DELAYS[i % 3]}
                className="group rounded-[20px] border border-white/[0.07] bg-white/[0.03] p-7 transition-[transform,border-color,background-color] duration-300 hover:-translate-y-1.5 hover:border-primary/30 hover:bg-white/[0.05]"
              >
                <div className="mb-[18px] inline-flex h-11 w-11 items-center justify-center rounded-[13px] bg-primary/10">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="mb-2 text-[16.5px] font-semibold text-white">
                  {t(`features.items.${feature.key}.title`)}
                </h3>
                <p className="text-sm leading-relaxed text-white/55">
                  {t(`features.items.${feature.key}.description`)}
                </p>
              </Reveal>
            )
          })}
        </div>
      </div>
    </section>
  )
}
