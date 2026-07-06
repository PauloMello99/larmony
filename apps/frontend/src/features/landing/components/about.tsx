import * as React from "react"
import { Check } from "lucide-react"
import { Badge } from "@/shared/components/ui/badge"

const STATS = [
  { value: "100%", label: "Centavos exatos, sem arredondamento" },
  { value: "∞", label: "Membros por lar" },
  { value: "PT-BR / EN", label: "Idiomas disponíveis" },
  { value: "RLS", label: "Dados isolados por lar" },
]

const BULLETS = [
  "Interface projetada para o dia a dia financeiro de uma casa",
  "Sem contratos de longo prazo — cancele quando quiser",
  "Convide quem mora com você para dividir as finanças",
  "Atualizações contínuas baseadas no feedback dos usuários",
  "Dados seguros com isolamento por lar e backups automáticos",
]

export function About() {
  return (
    <section id="sobre" className="py-16 md:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-16">
          {/* Left: text */}
          <div>
            <div className="mb-4">
              <Badge
                variant="outline"
                className="border-white/10 text-white/60"
              >
                Sobre o Larmony
              </Badge>
            </div>
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl md:text-5xl">
              Feito para quem
              <br />
              <span className="text-primary">divide as contas de casa</span>
            </h2>
            <p className="mt-6 leading-relaxed text-white/50">
              Construído para famílias e casais. Sabemos que organizar as finanças
              do lar não deveria depender de planilhas soltas e anotações perdidas.
              O Larmony cuida do controle para você focar no que realmente importa.
            </p>

            <ul className="mt-8 space-y-3">
              {BULLETS.map((bullet) => (
                <li key={bullet} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15">
                    <Check className="h-3 w-3 text-primary" />
                  </span>
                  <span className="text-sm text-white/60">{bullet}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Right: stats */}
          <div className="grid grid-cols-2 gap-4">
            {STATS.map((stat) => (
              <div
                key={stat.label}
                className="rounded-xl border border-white/5 bg-white/[0.03] p-4 sm:p-6"
              >
                <p className="text-2xl font-bold text-primary sm:text-4xl">
                  {stat.value}
                </p>
                <p className="mt-1 text-sm text-white/50">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
