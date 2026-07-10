"use client"

import * as React from "react"
import { Check } from "lucide-react"
import { Reveal } from "./reveal"
import { useCountUp } from "../lib/use-count-up"

const BULLETS = [
  "Interface projetada para o dia a dia financeiro de uma casa",
  "Convide quem mora com você para dividir as finanças",
  "Dados seguros com isolamento por lar e backups automáticos",
  "Sem contratos de longo prazo — cancele quando quiser",
]

function StatCard({
  value,
  label,
  delay,
}: {
  value: React.ReactNode
  label: string
  delay?: string
}) {
  return (
    <Reveal
      delay={delay}
      className="rounded-[20px] border border-white/[0.07] bg-white/[0.03] p-6 transition-colors hover:border-primary/30"
    >
      <div className="text-3xl font-extrabold tracking-tight text-primary">
        {value}
      </div>
      <p className="mt-1.5 text-[13.5px] leading-snug text-white/55">{label}</p>
    </Reveal>
  )
}

function PercentStat() {
  const { ref, display } = useCountUp<HTMLSpanElement>(100, { suffix: "%" })
  return (
    <span ref={ref} className="inline-block">
      {display}
    </span>
  )
}

export function About() {
  return (
    <section id="sobre" className="py-24">
      <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-14 px-4 sm:px-6 lg:grid-cols-2">
        {/* Left: text */}
        <Reveal>
          <span className="text-[12.5px] font-bold uppercase tracking-[0.12em] text-primary">
            Sobre o Larmony
          </span>
          <h2 className="mt-3 text-[28px] font-bold leading-tight tracking-tight text-white sm:text-4xl md:text-[42px]">
            Feito para quem{" "}
            <span className="text-primary">divide as contas de casa</span>
          </h2>
          <p className="mt-5 text-[15.5px] leading-relaxed text-white/55">
            Organizar as finanças do lar não deveria depender de planilhas soltas
            e anotações perdidas. O Larmony cuida do controle para você focar no
            que realmente importa.
          </p>

          <ul className="mt-7 space-y-3.5">
            {BULLETS.map((bullet) => (
              <li key={bullet} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15">
                  <Check className="h-3 w-3 text-primary" />
                </span>
                <span className="text-[14.5px] text-white/55">{bullet}</span>
              </li>
            ))}
          </ul>
        </Reveal>

        {/* Right: stats */}
        <div className="grid grid-cols-2 gap-4">
          <StatCard
            value={<PercentStat />}
            label="Centavos exatos, sem arredondamento"
          />
          <StatCard value="∞" label="Membros por lar" delay="lp-d1" />
          <StatCard value="2" label="Idiomas: português e inglês" delay="lp-d2" />
          <StatCard value="RLS" label="Dados isolados por lar" delay="lp-d3" />
        </div>
      </div>
    </section>
  )
}
