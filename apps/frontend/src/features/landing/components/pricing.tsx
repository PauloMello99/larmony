import * as React from "react"
import Link from "next/link"
import { Check, X } from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import { cn } from "@/shared/lib/utils"
import { SectionHeading } from "./section-heading"
import { Reveal } from "./reveal"

interface PlanFeature {
  label: string
  included: boolean
}

interface Plan {
  name: string
  price: string
  description: string
  features: PlanFeature[]
  cta: string
  href: string
  highlighted?: boolean
  badge?: string
}

const PLANS: Plan[] = [
  {
    name: "Pessoal",
    price: "Grátis",
    description: "Para quem está começando a organizar as próprias finanças.",
    cta: "Começar grátis",
    href: "/auth/signup",
    features: [
      { label: "Transações e categorias ilimitadas", included: true },
      { label: "1 lar", included: true },
      { label: "Orçamentos e metas", included: true },
      { label: "Lembretes de contas por e-mail", included: true },
      { label: "Relatórios avançados", included: false },
      { label: "Múltiplos membros no lar", included: false },
    ],
  },
  {
    name: "Família",
    price: "Grátis",
    description: "Para quem divide as contas da casa com outras pessoas.",
    cta: "Começar grátis",
    href: "/auth/signup",
    highlighted: true,
    badge: "Recomendado",
    features: [
      { label: "Transações e categorias ilimitadas", included: true },
      { label: "Membros ilimitados no lar", included: true },
      { label: "Orçamentos e metas", included: true },
      { label: "Lembretes de contas por e-mail", included: true },
      { label: "Relatórios avançados", included: true },
      { label: "Múltiplos lares", included: true },
    ],
  },
  {
    name: "Em breve",
    price: "A definir",
    description: "Recursos avançados para quem precisa de mais controle.",
    cta: "Entrar na lista de espera",
    href: "mailto:contato@larmony.me",
    features: [
      { label: "Exportação de relatórios", included: true },
      { label: "Integração com Open Finance", included: true },
      { label: "Automações personalizadas", included: true },
      { label: "Suporte prioritário", included: true },
    ],
  },
]

const DELAYS = ["", "lp-d1", "lp-d2"]

export function Pricing() {
  return (
    <section id="precos" className="py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <SectionHeading
          kicker="Preços"
          title="Simples e transparente"
          subtitle="Sem taxas escondidas. Cancele quando quiser."
        />

        <div className="grid grid-cols-1 items-start gap-5 md:grid-cols-3">
          {PLANS.map((plan, i) => (
            <Reveal
              key={plan.name}
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
                  {plan.badge}
                </span>
              )}

              <div className="mb-6">
                <p className="text-sm font-semibold text-white/55">
                  {plan.name}
                </p>
                <div className="mt-2 text-[34px] font-extrabold tracking-tight text-white">
                  {plan.price}
                </div>
                <p className="mt-2 text-[13.5px] leading-snug text-white/55">
                  {plan.description}
                </p>
              </div>

              <ul className="mb-7 flex-1 space-y-2.5">
                {plan.features.map((feature) => (
                  <li key={feature.label} className="flex items-center gap-2.5">
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
                      {feature.label}
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
                <Link href={plan.href}>{plan.cta}</Link>
              </Button>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
