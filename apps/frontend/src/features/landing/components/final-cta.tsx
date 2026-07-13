import * as React from "react"
import Link from "next/link"
import { useTranslation } from "react-i18next"
import { Button } from "@/shared/components/ui/button"
import { Reveal } from "./reveal"

export function FinalCta() {
  const { t } = useTranslation("landing")

  return (
    <section className="py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <Reveal
          className="relative overflow-hidden rounded-[28px] border border-primary/25 px-8 py-20 text-center"
          style={{
            background:
              "radial-gradient(120% 160% at 50% 120%, oklch(0.6 0.118 184.704 / 0.22), transparent 60%), rgba(255,255,255,0.03)",
          }}
        >
          <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl md:text-5xl">
            {t("finalCta.titleLine1")}
            <br />
            {t("finalCta.titleLine2")}
          </h2>
          <p className="mx-auto mt-3.5 max-w-md text-base leading-relaxed text-white/55">
            {t("finalCta.subtitle")}
          </p>
          <div className="mt-9 flex justify-center">
            <Button
              size="lg"
              asChild
              className="rounded-full bg-primary px-8 py-4 text-base text-primary-foreground hover:bg-primary/90"
            >
              <Link href="/auth/signup">{t("finalCta.cta")}</Link>
            </Button>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
