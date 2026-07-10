"use client"

import * as React from "react"
import { Plus } from "lucide-react"
import { cn } from "@/shared/lib/utils"
import { SectionHeading } from "./section-heading"
import { Reveal } from "./reveal"

const FAQ_ITEMS = [
  {
    q: "Quantas pessoas podem participar de um lar?",
    a: "Quantas você quiser. Cada pessoa tem o próprio login e senha, e o dono do lar controla quem entra e quem sai — pensado para casais, famílias e repúblicas.",
  },
  {
    q: "Meus dados financeiros estão seguros?",
    a: "Sim. Cada lar é isolado no banco de dados — um membro de um lar jamais enxerga dados de outro. Sua senha é criptografada e fazemos backups automáticos.",
  },
  {
    q: "Preciso conectar minha conta bancária?",
    a: "Não. O Larmony funciona com lançamentos manuais e recorrências automáticas — você controla exatamente o que entra. Integração com Open Finance está no roadmap.",
  },
  {
    q: "O Larmony arredonda valores?",
    a: "Nunca. Todo valor é armazenado em centavos exatos — se a conta deu R$ 33,33 para cada um, é isso que aparece. Precisão é um princípio do produto.",
  },
  {
    q: "Funciona em inglês?",
    a: "Sim — cada pessoa escolhe o próprio idioma (português ou inglês) e vê o mesmo lar traduzido, incluindo e-mails de lembrete.",
  },
]

export function Faq() {
  const [open, setOpen] = React.useState(0)

  return (
    <section id="faq" className="py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <SectionHeading kicker="FAQ" title="Perguntas frequentes" />

        <Reveal className="mx-auto max-w-3xl">
          {FAQ_ITEMS.map((item, i) => {
            const isOpen = open === i
            return (
              <div key={item.q} className="border-b border-white/[0.07]">
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? -1 : i)}
                  aria-expanded={isOpen}
                  className={cn(
                    "flex w-full items-center justify-between gap-4 py-5 text-left text-base font-semibold transition-colors",
                    isOpen ? "text-primary" : "text-white hover:text-primary",
                  )}
                >
                  {item.q}
                  <Plus
                    className={cn(
                      "h-5 w-5 shrink-0 transition-transform duration-300",
                      isOpen ? "rotate-45 text-primary" : "text-white/35",
                    )}
                  />
                </button>
                <div
                  className={cn(
                    "grid transition-all duration-300 ease-out",
                    isOpen
                      ? "grid-rows-[1fr] opacity-100"
                      : "grid-rows-[0fr] opacity-0",
                  )}
                >
                  <div className="overflow-hidden">
                    <p className="pb-5 text-[14.5px] leading-relaxed text-white/55">
                      {item.a}
                    </p>
                  </div>
                </div>
              </div>
            )
          })}
        </Reveal>
      </div>
    </section>
  )
}
