"use client"

import * as React from "react"
import { useRouter } from "next/router"
import { useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { Loader2 } from "lucide-react"
import Link from "next/link"
import { Button } from "@/shared/components/ui/button"
import { useAuth } from "@/features/auth/hooks/use-auth"
import {
  takeSocialAuthState,
  sanitizeInternalRedirect,
} from "@/features/auth/lib/social-auth-state"
import { queryKeys } from "@/infrastructure/query/query-keys"
import { translateApiError } from "@/shared/lib/api-error"

type CallbackStatus = "loading" | "error"

export function SocialCallbackHandler() {
  const { t } = useTranslation("auth")
  const { t: tCommon } = useTranslation("common")
  const router = useRouter()
  const { completeSocialSignIn } = useAuth()
  const queryClient = useQueryClient()
  const [status, setStatus] = React.useState<CallbackStatus>("loading")
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)
  const ranRef = React.useRef(false)

  React.useEffect(() => {
    if (ranRef.current) return
    ranRef.current = true

    void (async () => {
      // Binding de estado — defesa de login-CSRF. Sem estado válido nesta aba
      // (one-shot, gerado só por startSocialSignIn), NUNCA completar o login:
      // um atacante que force a vítima a abrir esta URL com tokens próprios
      // não deve conseguir logá-la silenciosamente na conta do atacante.
      const state = takeSocialAuthState()
      if (!state) {
        setStatus("error")
        return
      }

      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""))
      const searchParams = new URLSearchParams(window.location.search.replace(/^\?/, ""))

      const providerError =
        hashParams.get("error_description") ??
        hashParams.get("error") ??
        searchParams.get("error_description") ??
        searchParams.get("error")
      if (providerError) {
        setStatus("error")
        return
      }

      const accessToken = hashParams.get("access_token")
      const refreshToken = hashParams.get("refresh_token")
      const expiresInRaw = hashParams.get("expires_in")

      if (!accessToken || !refreshToken || !expiresInRaw) {
        setStatus("error")
        return
      }

      const expiresAt = Math.floor(Date.now() / 1000) + Number(expiresInRaw)

      // Tokens fora da URL/histórico assim que lidos.
      window.history.replaceState(null, "", "/auth/callback")

      try {
        const isNewUser = await completeSocialSignIn({
          accessToken,
          refreshToken,
          expiresAt,
          socialProvider: state.provider,
        })

        await queryClient.invalidateQueries({ queryKey: queryKeys.me })

        if (state.invite) {
          await router.replace(`/invite/accept?token=${encodeURIComponent(state.invite)}`)
          return
        }
        const safeRedirect = sanitizeInternalRedirect(state.redirect)
        if (safeRedirect) {
          await router.replace(safeRedirect)
          return
        }
        await router.replace(isNewUser ? "/households?welcome=1" : "/households")
      } catch (err) {
        // Mensagem específica por código (ex.: e-mail já cadastrado por senha)
        // quando disponível; fallback ao genérico de callback.
        setErrorMessage(translateApiError(err, tCommon))
        setStatus("error")
      }
    })()
  }, [completeSocialSignIn, queryClient, router, tCommon])

  if (status === "error") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm space-y-4 text-center">
          <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {errorMessage ?? t("callback.error")}
          </p>
          <Button
            asChild
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Link href="/auth/login">{t("callback.backToLogin")}</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen items-center justify-center bg-background">
      <Loader2 className="h-6 w-6 animate-spin text-foreground/30" />
    </div>
  )
}
