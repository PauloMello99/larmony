import * as React from "react"
import Link from "next/link"
import { Check, X } from "lucide-react"
import { Badge } from "@/shared/components/ui/badge"
import { Button } from "@/shared/components/ui/button"
import { cn } from "@/shared/lib/utils"

interface PlanFeature {
  label: string
  included: boolean
}

interface Plan {
  name: string
  price: string
  period: string
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
    period: "",
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
      { label: "Múltiplos lares", included: false },
      { label: "Suporte prioritário", included: false },
    ],
  },
  {
    name: "Família",
    price: "Grátis",
    period: "",
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
      { label: "Múltiplos membros no lar", included: true },
      { label: "Múltiplos lares", included: true },
      { label: "Suporte prioritário", included: false },
    ],
  },
  {
    name: "Em breve",
    price: "A definir",
    period: "",
    description: "Recursos avançados para quem precisa de mais controle.",
    cta: "Entrar na lista de espera",
    href: "mailto:contato@larmony.me",
    features: [
      { label: "Exportação de relatórios", included: true },
      { label: "Regras de recorrência avançadas", included: true },
      { label: "Integração com Open Finance", included: true },
      { label: "Relatórios avançados", included: true },
      { label: "Múltiplos membros no lar", included: true },
      { label: "Múltiplos lares", included: true },
      { label: "Automações personalizadas", included: true },
      { label: "Suporte prioritário", included: true },
    ],
  },
]

export function Pricing() {
  return (
    <section id="precos" className="py-16 md:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        {/* Header */}
        <div className="mb-10 text-center sm:mb-16">
          <div className="mb-4 flex justify-center">
            <Badge
              variant="outline"
              className="border-white/10 text-white/60"
            >
              Preços
            </Badge>
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl md:text-5xl">
            Simples e transparente
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-white/50">
            Sem taxas escondidas. Cancele quando quiser.
          </p>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={cn(
                "relative flex flex-col rounded-2xl border p-8 transition-all",
                plan.highlighted
                  ? "border-primary/50 bg-primary/5"
                  : "border-white/5 bg-white/[0.03]",
              )}
            >
              {plan.badge && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <Badge className="bg-primary text-white">
                    {plan.badge}
                  </Badge>
                </div>
              )}

              <div className="mb-6">
                <p className="text-sm font-medium text-white/60">{plan.name}</p>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-white sm:text-4xl">
                    {plan.price}
                  </span>
                  {plan.period && (
                    <span className="text-white/40">{plan.period}</span>
                  )}
                </div>
                <p className="mt-3 text-sm text-white/50">{plan.description}</p>
              </div>

              <ul className="mb-8 flex-1 space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature.label} className="flex items-center gap-3">
                    {feature.included ? (
                      <Check className="h-4 w-4 shrink-0 text-green-400" />
                    ) : (
                      <X className="h-4 w-4 shrink-0 text-white/20" />
                    )}
                    <span
                      className={cn(
                        "text-sm",
                        feature.included ? "text-white/70" : "text-white/30",
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
                  "w-full",
                  plan.highlighted
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "border border-white/10 bg-transparent text-white hover:bg-white/5",
                )}
              >
                <Link href={plan.href}>{plan.cta}</Link>
              </Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
