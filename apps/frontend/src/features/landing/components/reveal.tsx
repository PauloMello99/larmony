"use client"

import * as React from "react"
import { cn } from "@/shared/lib/utils"
import { useReveal } from "../lib/use-reveal"

interface RevealProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Atraso escalonado: "lp-d1" | "lp-d2" | "lp-d3". */
  delay?: string
  className?: string
  children: React.ReactNode
}

/**
 * Envolve um bloco que aparece ao rolar até ele. A transição vive no CSS global
 * de `LandingPage` (`.lp-reveal` / `.in`), com fallbacks para reduced-motion e
 * no-JS. Use `delay` para escalonar itens de um grid.
 */
export function Reveal({ delay, className, children, ...props }: RevealProps) {
  const { ref, shown } = useReveal<HTMLDivElement>()
  return (
    <div
      ref={ref}
      className={cn("lp-reveal", delay, shown && "in", className)}
      {...props}
    >
      {children}
    </div>
  )
}
