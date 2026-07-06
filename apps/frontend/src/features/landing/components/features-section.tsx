import * as React from "react"
import {
  ArrowLeftRight,
  Target,
  PiggyBank,
  BarChart3,
  Bell,
  Users,
} from "lucide-react"
import { Badge } from "@/shared/components/ui/badge"

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

export function FeaturesSection() {
  return (
    <section id="recursos" className="py-16 md:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        {/* Header */}
        <div className="mb-16 text-center">
          <div className="mb-4 flex justify-center">
            <Badge
              variant="outline"
              className="border-white/10 text-white/60"
            >
              Recursos
            </Badge>
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl md:text-5xl">
            Tudo que você precisa
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-white/50">
            Projetado para o dia a dia de quem organiza as finanças de casa,
            sozinho ou com a família.
          </p>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => {
            const Icon = feature.icon
            return (
              <div
                key={feature.title}
                className="group rounded-xl border border-white/5 bg-white/[0.03] p-6 transition-all hover:border-white/10 hover:bg-white/[0.05]"
              >
                <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="mb-2 text-base font-semibold text-white">
                  {feature.title}
                </h3>
                <p className="text-sm leading-relaxed text-white/50">
                  {feature.description}
                </p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
