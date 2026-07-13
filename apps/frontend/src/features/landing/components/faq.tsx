"use client"

import * as React from "react"
import { useTranslation } from "react-i18next"
import { Plus } from "lucide-react"
import { cn } from "@/shared/lib/utils"
import { SectionHeading } from "./section-heading"
import { Reveal } from "./reveal"

// Sufixos das chaves em `faq.items.<qN>` (indexadas p/ o checker de sync de locales).
const FAQ_ITEMS = ["q1", "q2", "q3", "q4", "q5", "q6"]

export function Faq() {
  const { t } = useTranslation("landing")
  const [open, setOpen] = React.useState(0)

  return (
    <section id="faq" className="py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <SectionHeading kicker={t("faq.kicker")} title={t("faq.title")} />

        <Reveal className="mx-auto max-w-3xl">
          {FAQ_ITEMS.map((item, i) => {
            const isOpen = open === i
            return (
              <div key={item} className="border-b border-white/[0.07]">
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? -1 : i)}
                  aria-expanded={isOpen}
                  className={cn(
                    "flex w-full items-center justify-between gap-4 py-5 text-left text-base font-semibold transition-colors",
                    isOpen ? "text-primary" : "text-white hover:text-primary",
                  )}
                >
                  {t(`faq.items.${item}.question`)}
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
                      {t(`faq.items.${item}.answer`)}
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
