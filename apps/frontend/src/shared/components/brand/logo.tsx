import * as React from "react"
import { cn } from "@/shared/lib/utils"

interface LogoProps {
  className?: string
}

/**
 * Wordmark do Larmony. "lar" em primary (a casa é a marca) + "mony" em
 * foreground. Único ponto de verdade do branding no app.
 */
export function Logo({ className }: LogoProps) {
  return (
    <span className={cn("select-none text-lg font-bold tracking-tight", className)}>
      <span className="text-primary">lar</span>
      <span className="text-foreground">mony</span>
    </span>
  )
}
