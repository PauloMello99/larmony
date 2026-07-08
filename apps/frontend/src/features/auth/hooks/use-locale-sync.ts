"use client"

import * as React from "react"
import { useRouter } from "next/router"
import { useMe } from "@/features/auth/hooks/use-me"
import { normalizeLocale, setLocaleCookie } from "@/shared/lib/locale"

/**
 * Reconcilia o locale do perfil (`users.locale`) com o locale ativo do Next.js
 * após o login. Sem isto, um usuário que escolheu `en` volta a ver pt-BR ao
 * recarregar, porque o Next.js só detecta o idioma pelo cookie `NEXT_LOCALE` /
 * defaultLocale — não pelo perfil (ADR-0018).
 *
 * Deve ser montado em área autenticada (AuthGuard), onde `GET /auth/me` é válido.
 */
export function useLocaleSync(): void {
  const router = useRouter()
  const { me } = useMe()

  React.useEffect(() => {
    if (!me) return
    const profileLocale = normalizeLocale(me.locale)

    // Mantém o cookie de detecção alinhado ao perfil (sobrevive a reloads).
    setLocaleCookie(profileLocale)

    // Se a rota atual está num locale diferente do perfil, troca uma única vez.
    if (router.locale && router.locale !== profileLocale) {
      void router.replace(router.asPath, router.asPath, { locale: profileLocale })
    }
  }, [me, router])
}
