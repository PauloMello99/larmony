"use client"

import * as React from "react"
import { useTranslation } from "react-i18next"
import { useMe } from "@/features/auth/hooks/use-me"
import { normalizeLocale, setLocaleCookie } from "@/shared/lib/locale"

/**
 * Reconcilia o locale do perfil (`users.locale`) com o locale ativo da página
 * após o login. Sem isto, um usuário que escolheu `en` volta a ver pt-BR ao
 * recarregar, porque a detecção usa o cookie `NEXT_LOCALE` / defaultLocale —
 * não o perfil (ADR-0018).
 *
 * O locale NÃO influencia a rota (sem prefixo `/en/`, `/es/`): "trocar" aqui é
 * cookie + `window.location.reload()` no MESMO caminho (garante que o SSR relê
 * o cookie via `makeI18nProps`, mesmo em páginas sem data-fetching próprio —
 * ver shared/components/locale-switcher.tsx). Autoterminante: após o reload, o
 * cookie já bate com o perfil, então a condição não dispara de novo.
 *
 * Deve ser montado em área autenticada (AuthGuard), onde `GET /auth/me` é válido.
 */
export function useLocaleSync(): void {
  const { i18n } = useTranslation()
  const { me } = useMe()

  React.useEffect(() => {
    if (!me) return
    const profileLocale = normalizeLocale(me.locale)

    // Mantém o cookie de detecção alinhado ao perfil (sobrevive a reloads).
    setLocaleCookie(profileLocale)

    // Se a página está renderizada num locale diferente do perfil, corrige uma única vez.
    if (normalizeLocale(i18n.language) !== profileLocale) {
      window.location.reload()
    }
  }, [me, i18n])
}
