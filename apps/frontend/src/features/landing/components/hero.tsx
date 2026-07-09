import * as React from "react"
import Link from "next/link"
import { Button } from "@/shared/components/ui/button"
import { Badge } from "@/shared/components/ui/badge"
import { BackgroundGrid } from "./background-grid"
import { HeroModel } from "./hero-model"

export function Hero() {
  return (
    <section className="relative overflow-hidden py-20 md:py-32">
      <BackgroundGrid variant="dots" glows={true} />

      {/* Render 3D — ocupa a section inteira, atrás do texto (não bloqueia cliques).
          Oculto abaixo de lg: sem largura para a casa ao lado do texto sem sobrepor,
          e evita o custo de WebGL/GLB em telas menores. */}
      <div className="pointer-events-none absolute inset-0 z-0 hidden lg:block">
        <HeroModel />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6">
        <div className="max-w-xl text-center md:text-left">
          {/* Eyebrow badge */}
          <div className="mb-5 flex justify-center sm:mb-6 md:justify-start">
            <Badge
              variant="outline"
              className="border-primary/30 bg-primary/10 text-primary"
            >
              ✦ Novo — Lembretes automáticos de contas
            </Badge>
          </div>

          {/* Headline — mobile-first sizing */}
          <h1 className="text-4xl font-bold leading-tight tracking-tight text-white sm:text-5xl md:text-6xl lg:text-7xl">
            Controle financeiro
            <br />
            <span className="text-primary">do seu lar</span>
          </h1>

          {/* Subtitle */}
          <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-white/60 sm:mt-6 sm:text-lg md:mx-0">
            Transações, orçamentos, metas e contas a pagar em um único lugar.
            Construído para famílias e casais que dividem as finanças de casa.
          </p>

          {/* CTAs */}
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:mt-10 sm:flex-row sm:gap-4 md:justify-start">
            <Button
              size="lg"
              asChild
              className="w-full bg-primary px-8 text-white hover:bg-primary/90 sm:w-auto"
            >
              <Link href="/auth/signup">Começar grátis</Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="w-full bg-transparent sm:w-auto"
            >
              Ver demonstração →
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}
