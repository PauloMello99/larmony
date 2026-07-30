"use client"

import * as React from "react"
import { useTranslation } from "react-i18next"
import { Loader2 } from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import { useAuth } from "@/features/auth/hooks/use-auth"
import type { SocialProvider } from "@/features/auth/types"

interface SocialAuthButtonsProps {
  invite?: string
  redirect?: string
}

// Ícones de marca (Google multicolor, Apple monocromático via currentColor) —
// lucide-react não tem logos de marca. As cores do Google SÃO cores de marca
// (não tokens de tema) — exceção legítima ao "sem cor hardcoded".
function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  )
}

function AppleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden="true">
      <path d="M16.365 1.43c0 1.14-.475 2.14-1.256 2.9-.85.83-1.998 1.44-3.11 1.36-.13-1.14.42-2.24 1.19-3 .87-.87 2.11-1.4 3.176-1.26zm3.11 17.02c-.6 1.36-.88 1.97-1.64 3.17-1.06 1.67-2.55 3.75-4.4 3.77-1.63.02-2.05-1.06-4.26-1.05-2.21.01-2.67 1.07-4.3 1.05-1.85-.02-3.26-1.9-4.32-3.57-2.97-4.64-3.28-10.08-1.45-12.98 1.3-2.06 3.35-3.27 5.28-3.27 1.96 0 3.19 1.08 4.82 1.08 1.58 0 2.53-1.08 4.82-1.08 1.7 0 3.5.93 4.79 2.53-4.21 2.31-3.53 8.32.52 10.35z" />
    </svg>
  )
}

export function SocialAuthButtons({ invite, redirect }: SocialAuthButtonsProps) {
  const { t } = useTranslation("auth")
  const { startSocialSignIn } = useAuth()
  const [loadingProvider, setLoadingProvider] = React.useState<SocialProvider | null>(
    null,
  )
  const [error, setError] = React.useState<string | null>(null)

  const handleClick = async (provider: SocialProvider) => {
    setError(null)
    setLoadingProvider(provider)
    try {
      await startSocialSignIn(provider, { invite, redirect })
      // Se resolver sem navegar (não deveria, mas defensivo), zera o loading.
    } catch {
      setError(t("social.startError"))
      setLoadingProvider(null)
    }
  }

  const busy = loadingProvider !== null

  return (
    <div className="w-full space-y-3">
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-foreground/10" />
        <span className="text-xs text-foreground/40">{t("social.divider")}</span>
        <div className="h-px flex-1 bg-foreground/10" />
      </div>

      {error && (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <Button
        type="button"
        variant="outline"
        className="w-full border-foreground/10"
        disabled={busy}
        onClick={() => void handleClick("google")}
      >
        {loadingProvider === "google" ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <GoogleIcon />
        )}
        {t("social.google")}
      </Button>

      <Button
        type="button"
        variant="outline"
        className="w-full border-foreground/10"
        disabled={busy}
        onClick={() => void handleClick("apple")}
      >
        {loadingProvider === "apple" ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <AppleIcon />
        )}
        {t("social.apple")}
      </Button>
    </div>
  )
}
