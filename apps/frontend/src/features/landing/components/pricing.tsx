import * as React from "react"
import Link from "next/link"
import { useTranslation } from "react-i18next"
import { Check, X } from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import { cn } from "@/shared/lib/utils"
import { SectionHeading } from "./section-heading"
import { Reveal } from "./reveal"

interface PlanFeature {
  /** Sufixo da chave em `pricing.plans.<plan>.features.<fN>`. */
  key: string
  included: boolean
}

interface Plan {
  /** Sufixo da chave em `pricing.plans.<key>`. */
  key: string
  features: PlanFeature[]
  href: string
  highlighted?: boolean
  badge?: boolean
}

const PLANS: Plan[] = [
  {
    key: "personal",
    href: "/auth/signup",
    features: [
      { key: "f1", included: true },
      { key: "f2", included: true },
      { key: "f3", included: true },
      { key: "f4", included: true },
      { key: "f5", included: false },
      { key: "f6", included: false },
    ],
  },
  {
    key: "family",
    href: "/auth/signup",
    highlighted: true,
    badge: true,
    features: [
      { key: "f1", included: true },
      { key: "f2", included: true },
      { key: "f3", included: true },
      { key: "f4", included: true },
      { key: "f5", included: true },
      { key: "f6", included: true },
    ],
  },
  {
    key: "soon",
    href: "mailto:contato@larmony.me",
    features: [
      { key: "f1", included: true },
      { key: "f2", included: true },
      { key: "f3", included: true },
      { key: "f4", included: true },
    ],
  },
]

const DELAYS = ["", "lp-d1", "lp-d2"]

export function Pricing() {
  const { t } = useTranslation("landing")

  return (
    <section id="precos" className="py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <SectionHeading
          kicker={t("pricing.kicker")}
          title={t("pricing.title")}
          subtitle={t("pricing.subtitle")}
        />

        <div className="grid grid-cols-1 items-start gap-5 md:grid-cols-3">
          {PLANS.map((plan, i) => (
            <Reveal
              key={plan.key}
              delay={DELAYS[i % 3]}
              className={cn(
                "relative flex flex-col rounded-3xl border p-8 transition-transform duration-300 hover:-translate-y-1.5",
                plan.highlighted
                  ? "border-primary/50 bg-primary/5"
                  : "border-white/[0.07] bg-white/[0.03]",
              )}
            >
              {plan.badge && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3.5 py-1 text-[11.5px] font-bold text-primary-foreground">
                  {t(`pricing.plans.${plan.key}.badge`)}
                </span>
              )}

              <div className="mb-6">
                <p className="text-sm font-semibold text-white/55">
                  {t(`pricing.plans.${plan.key}.name`)}
                </p>
                <div className="mt-2 text-[34px] font-extrabold tracking-tight text-white">
                  {t(`pricing.plans.${plan.key}.price`)}
                </div>
                <p className="mt-2 text-[13.5px] leading-snug text-white/55">
                  {t(`pricing.plans.${plan.key}.description`)}
                </p>
              </div>

              <ul className="mb-7 flex-1 space-y-2.5">
                {plan.features.map((feature) => (
                  <li key={feature.key} className="flex items-center gap-2.5">
                    {feature.included ? (
                      <Check className="h-4 w-4 shrink-0 text-success" />
                    ) : (
                      <X className="h-4 w-4 shrink-0 text-white/20" />
                    )}
                    <span
                      className={cn(
                        "text-[13.5px]",
                        feature.included ? "text-white/70" : "text-white/25",
                      )}
                    >
                      {t(`pricing.plans.${plan.key}.features.${feature.key}`)}
                    </span>
                  </li>
                ))}
              </ul>

              <Button
                asChild
                className={cn(
                  "w-full rounded-full",
                  plan.highlighted
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "border border-white/15 bg-transparent text-white hover:bg-white/5",
                )}
              >
                <Link href={plan.href}>{t(`pricing.plans.${plan.key}.cta`)}</Link>
              </Button>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
