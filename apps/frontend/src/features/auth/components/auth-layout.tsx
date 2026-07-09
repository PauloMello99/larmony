"use client"

import * as React from "react"
import { LocaleSwitcher } from "@/shared/components/locale-switcher"

/**
 * Casca compartilhada das telas públicas centralizadas (login, signup, recover,
 * reset, aceitar convite). Centraliza o card e expõe o seletor de idioma no canto
 * — antes cada tela duplicava o mesmo wrapper `min-h-screen flex ...`.
 */
export function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background px-4">
      <div className="absolute right-4 top-4">
        <LocaleSwitcher />
      </div>
      {children}
    </div>
  )
}
