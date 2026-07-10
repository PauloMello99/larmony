import * as React from "react"
import { cn } from "@/shared/lib/utils"
import { Reveal } from "./reveal"

interface SectionHeadingProps {
  kicker: string
  title: React.ReactNode
  subtitle?: React.ReactNode
  className?: string
}

/** Cabeçalho centralizado de seção da landing: kicker + h2 + subtítulo. */
export function SectionHeading({
  kicker,
  title,
  subtitle,
  className,
}: SectionHeadingProps) {
  return (
    <Reveal className={cn("mx-auto mb-16 max-w-xl text-center", className)}>
      <span className="text-[12.5px] font-bold uppercase tracking-[0.12em] text-primary">
        {kicker}
      </span>
      <h2 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl md:text-[44px]">
        {title}
      </h2>
      {subtitle && (
        <p className="mt-3.5 text-base leading-relaxed text-white/55">
          {subtitle}
        </p>
      )}
    </Reveal>
  )
}
