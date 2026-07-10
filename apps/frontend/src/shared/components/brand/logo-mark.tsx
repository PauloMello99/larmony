import * as React from "react"
import { cn } from "@/shared/lib/utils"

interface LogoMarkProps extends React.SVGProps<SVGSVGElement> {
  /** Tamanho em px do quadrado (default 32). */
  size?: number
  /** Cor da casa (recorte). Default branco — o 1a canônico. */
  houseColor?: string
  className?: string
}

/**
 * Marca-ícone do Larmony — conceito "1a" (tile, casa de porta aberta):
 * squircle preenchido com a cor primária (teal via `currentColor`) e uma casa
 * de porta arqueada recortada. Serve como favicon/app-icon e lockup ao lado do
 * wordmark ({@link ./logo.tsx}). Colorir o tile via `text-primary` no consumidor.
 */
export function LogoMark({
  size = 32,
  houseColor = "#ffffff",
  className,
  ...props
}: LogoMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 96 96"
      className={cn("text-primary", className)}
      role="img"
      aria-label="Larmony"
      {...props}
    >
      <rect width="96" height="96" rx="26" fill="currentColor" />
      <path
        d="M48 24 L74 45 L74 68 A6 6 0 0 1 68 74 L28 74 A6 6 0 0 1 22 68 L22 45 Z"
        fill={houseColor}
      />
      <path d="M41 74 L41 56 A7 7 0 0 1 55 56 L55 74 Z" fill="currentColor" />
    </svg>
  )
}
