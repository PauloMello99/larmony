import * as React from "react"
import Link from "next/link"
import { Trans, useTranslation } from "react-i18next"
import { Check } from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import { cn } from "@/shared/lib/utils"
import { SectionHeading } from "./section-heading"
import { Reveal } from "./reveal"

interface Plan {
  /** Sufixo da chave em `pricing.plans.<key>`. */
  key: "essencial" | "completo"
  /** Sufixos das features em `pricing.plans.<key>.features.<fN>`. */
  features: string[]
  highlighted?: boolean
  badge?: boolean
}

const PLANS: Plan[] = [
  { key: "essencial", features: ["f1", "f2", "f3", "f4", "f5"] },
  {
    key: "completo",
    highlighted: true,
    badge: true,
    features: ["f1", "f2", "f3", "f4", "f5", "f6"],
  },
]

// Preços travados 2026-07-14 (pricing-strategist + sign-off do responsável) —
// mesmos valores do PLAN_CATALOG do backend e do CLIENT_PLAN_CATALOG do app
// (M16). Hardcoded aqui pelo mesmo motivo do resto da landing: preço é
// decisão de produto, não dado dinâmico buscado do backend.
const PRICES = {
  essencial: { monthly: "R$ 9,90", annual: "R$ 99" },
  completo: { monthly: "R$ 19,90", annual: "R$ 199" },
} as const

const DELAYS = ["", "lp-d1"]

export function Pricing() {
  const { t } = useTranslation("landing")
  const [interval, setInterval] = React.useState<"monthly" | "annual">("monthly")

  return (
    <section id="precos" className="py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <SectionHeading
          kicker={t("pricing.kicker")}
          title={t("pricing.title")}
          subtitle={t("pricing.subtitle")}
        />

        <div className="mb-8 flex justify-center">
          <div className="inline-flex rounded-full border border-white/[0.08] p-1 text-sm">
            <button
              type="button"
              onClick={() => setInterval("monthly")}
              className={cn(
                "rounded-full px-4 py-1.5 font-medium transition-colors",
                interval === "monthly" ? "bg-white/10 text-white" : "text-white/50",
              )}
            >
              {t("pricing.intervalMonthly")}
            </button>
            <button
              type="button"
              onClick={() => setInterval("annual")}
              className={cn(
                "rounded-full px-4 py-1.5 font-medium transition-colors",
                interval === "annual" ? "bg-white/10 text-white" : "text-white/50",
              )}
            >
              {t("pricing.intervalAnnual")}
            </button>
          </div>
        </div>

        <div className="mx-auto grid max-w-3xl grid-cols-1 items-stretch gap-5 md:grid-cols-2">
          {PLANS.map((plan, i) => (
            <Reveal
              key={plan.key}
              delay={DELAYS[i % 2]}
              className={cn(
                "relative flex h-full flex-col rounded-3xl border p-8 transition-transform duration-300 hover:-translate-y-1.5",
                plan.highlighted
                  ? "border-primary/50 bg-primary/5"
                  : "border-white/[0.07] bg-white/[0.03]",
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
                    {PRICES[plan.key][interval === "monthly" ? "monthly" : "annual"]}
                  </span>
                  <span className="text-[13px] text-white/40">
                    {interval === "monthly" ? t("pricing.perMonth") : t("pricing.perYear")}
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

              <Button
                asChild
                className={cn(
                  "w-full rounded-full",
                  plan.highlighted
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "border border-white/15 bg-transparent text-white hover:bg-white/5",
                )}
              >
                <Link href="/auth/signup">{t(`pricing.plans.${plan.key}.cta`)}</Link>
              </Button>
            </Reveal>
          ))}
        </div>

        <p className="mx-auto mt-8 max-w-lg text-center text-[12.5px] leading-relaxed text-white/35">
          {t("pricing.note")}
        </p>

        <div className="mx-auto mt-4 max-w-lg text-center text-[11.5px] leading-relaxed text-white/30">
          <p>{t("pricing.disclosure.renewal")}</p>
          <p className="mt-1">
            <Trans
              t={t}
              i18nKey="pricing.disclosure.terms"
              components={{
                terms: (
                  <Link
                    href="/legal/termos-de-uso"
                    className="underline hover:text-white/50"
                  />
                ),
                privacy: (
                  <Link
                    href="/legal/privacidade"
                    className="underline hover:text-white/50"
                  />
                ),
              }}
            />
          </p>
        </div>
      </div>
    </section>
  )
}
