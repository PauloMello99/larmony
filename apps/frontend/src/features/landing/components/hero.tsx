"use client"

import * as React from "react"
import Link from "next/link"
import { useTranslation } from "react-i18next"
import { Button } from "@/shared/components/ui/button"
import { Badge } from "@/shared/components/ui/badge"
import { BackgroundGrid } from "./background-grid"
import { HeroModel } from "./hero-model"
import { useCountUp } from "../lib/use-count-up"

function ProofNumber({
  target,
  suffix,
}: {
  target: number
  suffix?: string
}) {
  const { ref, display } = useCountUp<HTMLSpanElement>(target, { suffix })
  return (
    <span ref={ref} className="text-2xl font-bold text-white sm:text-[26px]">
      {display}
    </span>
  )
}

export function Hero() {
  const { t } = useTranslation("landing")

  return (
    <section className="relative overflow-hidden pb-24 pt-32 md:pt-40 lg:pt-44">
      <BackgroundGrid variant="dots" glows={true} />

      {/* Halo radial atrás da casa (só onde o 3D aparece) */}
      <div
        className="pointer-events-none absolute right-0 top-1/2 hidden h-[520px] w-[520px] -translate-y-1/2 rounded-full lg:block"
        style={{
          background:
            "radial-gradient(circle, oklch(0.704 0.14 182.503 / 0.14), transparent 65%)",
        }}
        aria-hidden="true"
      />

      {/* Render 3D — ocupa a section inteira, atrás do texto (não bloqueia
          cliques). Oculto abaixo de lg: sem largura para a casa ao lado do
          texto sem sobrepor, e evita o custo de WebGL/GLB em telas menores. */}
      <div className="pointer-events-none absolute inset-0 z-0 hidden lg:block">
        <HeroModel />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6">
        <div className="max-w-xl text-center md:text-left">
          {/* Eyebrow badge */}
          <div className="mb-5 flex justify-center sm:mb-6 md:justify-start">
            <Badge
              variant="outline"
              className="rounded-full border-primary/25 bg-primary/[0.09] px-3.5 py-1.5 text-primary"
            >
              {t("hero.badge")}
            </Badge>
          </div>

          {/* Headline — mobile-first sizing */}
          <h1 className="text-4xl font-extrabold leading-[1.06] tracking-tight text-white sm:text-5xl md:text-6xl lg:text-7xl">
            {t("hero.titleLine1")}
            <br />
            <span className="text-primary">{t("hero.titleHighlight")}</span>
          </h1>

          {/* Subtitle */}
          <p className="mx-auto mt-6 max-w-md text-base leading-relaxed text-white/55 sm:text-lg md:mx-0">
            {t("hero.subtitle")}
          </p>

          {/* CTAs */}
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4 md:justify-start">
            <Button
              size="lg"
              asChild
              className="w-full rounded-full bg-primary px-8 text-primary-foreground hover:bg-primary/90 sm:w-auto"
            >
              <Link href="/auth/signup">{t("hero.ctaPrimary")}</Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              asChild
              className="w-full rounded-full border-white/15 bg-transparent text-white/80 hover:bg-white/5 hover:text-white sm:w-auto"
            >
              <Link href="#tour">{t("hero.ctaSecondary")}</Link>
            </Button>
          </div>

          {/* Proof stats */}
          <div className="mt-12 flex justify-center gap-7 sm:gap-8 md:justify-start">
            <div>
              <ProofNumber target={100} suffix="%" />
              <p className="mt-0.5 text-xs leading-tight text-white/35 sm:text-[12.5px]">
                {t("hero.proof.centsLine1")}
                <br />
                {t("hero.proof.centsLine2")}
              </p>
            </div>
            <div>
              <span className="text-2xl font-bold text-white sm:text-[26px]">
                ∞
              </span>
              <p className="mt-0.5 text-xs leading-tight text-white/35 sm:text-[12.5px]">
                {t("hero.proof.membersLine1")}
                <br />
                {t("hero.proof.membersLine2")}
              </p>
            </div>
            <div>
              <ProofNumber target={7} />
              <p className="mt-0.5 text-xs leading-tight text-white/35 sm:text-[12.5px]">
                {t("hero.proof.languagesLine1")}
                <br />
                {t("hero.proof.languagesLine2")}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
