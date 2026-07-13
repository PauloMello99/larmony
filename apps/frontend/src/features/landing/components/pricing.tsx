import * as React from "react"
import Link from "next/link"
import { useTranslation } from "react-i18next"
import { Check } from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import { cn } from "@/shared/lib/utils"
import { SectionHeading } from "./section-heading"
import { Reveal } from "./reveal"

interface Plan {
  /** Sufixo da chave em `pricing.plans.<key>`. */
  key: string
  /** Sufixos das features em `pricing.plans.<key>.features.<fN>`. */
  features: string[]
  /** Ausente = plano desabilitado (Pro / "em breve"). */
  href?: string
  highlighted?: boolean
  badge?: boolean
}

const PLANS: Plan[] = [
  {
    key: "free",
    href: "/auth/signup",
    features: ["f1", "f2", "f3", "f4", "f5"],
  },
  {
    key: "family",
    href: "/auth/signup",
    highlighted: true,
    badge: true,
    features: ["f1", "f2", "f3", "f4"],
  },
  {
    key: "pro",
    badge: true,
    features: ["f1", "f2", "f3", "f4"],
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

        <div className="grid grid-cols-1 items-stretch gap-5 md:grid-cols-3">
          {PLANS.map((plan, i) => {
            const disabled = !plan.href
            return (
              <Reveal
                key={plan.key}
                delay={DELAYS[i % 3]}
                className={cn(
                  "relative flex h-full flex-col rounded-3xl border p-8 transition-transform duration-300",
                  plan.highlighted
                    ? "border-primary/50 bg-primary/5"
                    : "border-white/[0.07] bg-white/[0.03]",
                  disabled ? "opacity-70" : "hover:-translate-y-1.5",
                )}
              >
                {plan.badge && (
                  <span
                    className={cn(
                      "absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-3.5 py-1 text-[11.5px] font-bold",
                      plan.highlighted
                        ? "bg-primary text-primary-foreground"
                        : "bg-white/10 text-white/70",
                    )}
                  >
                    {t(`pricing.plans.${plan.key}.badge`)}
                  </span>
                )}

                <div className="mb-6">
                  <p className="text-sm font-semibold text-white/55">
                    {t(`pricing.plans.${plan.key}.name`)}
                  </p>
                  <div className="mt-2 flex items-baseline gap-1.5">
                    <span className="text-[34px] font-extrabold tracking-tight text-white">
                      {t(`pricing.plans.${plan.key}.price`)}
                    </span>
                    <span className="text-[13px] text-white/40">
                      {t(`pricing.plans.${plan.key}.period`)}
                    </span>
                  </div>
                  <p className="mt-2 text-[13.5px] leading-snug text-white/55">
                    {t(`pricing.plans.${plan.key}.description`)}
                  </p>
                </div>

                <ul className="mb-7 flex-1 space-y-2.5">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2.5">
                      <Check
                        className={cn(
                          "h-4 w-4 shrink-0",
                          plan.highlighted ? "text-primary" : "text-success",
                        )}
                      />
                      <span className="text-[13.5px] text-white/70">
                        {t(`pricing.plans.${plan.key}.features.${feature}`)}
                      </span>
                    </li>
                  ))}
                </ul>

                {disabled ? (
                  <Button
                    disabled
                    className="w-full cursor-not-allowed rounded-full border border-white/10 bg-transparent text-white/40"
                  >
                    {t(`pricing.plans.${plan.key}.cta`)}
                  </Button>
                ) : (
                  <Button
                    asChild
                    className={cn(
                      "w-full rounded-full",
                      plan.highlighted
                        ? "bg-primary text-primary-foreground hover:bg-primary/90"
                        : "border border-white/15 bg-transparent text-white hover:bg-white/5",
                    )}
                  >
                    <Link href={plan.href!}>{t(`pricing.plans.${plan.key}.cta`)}</Link>
                  </Button>
                )}
              </Reveal>
            )
          })}
        </div>

        <p className="mx-auto mt-8 max-w-lg text-center text-[12.5px] leading-relaxed text-white/35">
          {t("pricing.note")}
        </p>
      </div>
    </section>
  )
}
