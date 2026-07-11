import * as React from "react"
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
  {
    icon: ArrowLeftRight,
    title: "Transações organizadas",
    description:
      "Categorize receitas e despesas, divida gastos entre quem mora na casa e acompanhe tudo em tempo real.",
  },
  {
    icon: PiggyBank,
    title: "Orçamentos por categoria",
    description:
      "Defina limites mensais por categoria e veja o quanto já foi gasto, com alerta quando estourar.",
  },
  {
    icon: Target,
    title: "Metas de economia",
    description:
      "Crie metas para a viagem, a reforma ou a reserva de emergência e acompanhe o progresso junto com o lar.",
  },
  {
    icon: BarChart3,
    title: "Dashboard com KPIs reais",
    description:
      "Saldo do mês, comparação com o mês anterior, contas a vencer e orçamentos em um único painel.",
  },
  {
    icon: Bell,
    title: "Lembretes de contas",
    description:
      "Nunca mais esqueça uma conta a pagar — notificação in-app e por e-mail antes do vencimento.",
  },
  {
    icon: Users,
    title: "Feito para o lar",
    description:
      "Convide quem mora com você, cada um com seu papel, e organizem as finanças domésticas juntos.",
  },
]

const DELAYS = ["", "lp-d1", "lp-d2"]

export function FeaturesSection() {
  return (
    <section id="recursos" className="py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <SectionHeading
          kicker="Recursos"
          title="Tudo que o seu lar precisa"
          subtitle="Projetado para o dia a dia de quem organiza as finanças de casa — sozinho ou com a família."
        />

        <div className="grid grid-cols-1 gap-[18px] sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature, i) => {
            const Icon = feature.icon
            return (
              <Reveal
                key={feature.title}
                delay={DELAYS[i % 3]}
                className="group rounded-[20px] border border-white/[0.07] bg-white/[0.03] p-7 transition-[transform,border-color,background-color] duration-300 hover:-translate-y-1.5 hover:border-primary/30 hover:bg-white/[0.05]"
              >
                <div className="mb-[18px] inline-flex h-11 w-11 items-center justify-center rounded-[13px] bg-primary/10">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="mb-2 text-[16.5px] font-semibold text-white">
                  {feature.title}
                </h3>
                <p className="text-sm leading-relaxed text-white/55">
                  {feature.description}
                </p>
              </Reveal>
            )
          })}
        </div>
      </div>
    </section>
  )
}
