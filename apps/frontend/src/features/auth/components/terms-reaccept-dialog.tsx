"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/router"
import { Trans, useTranslation } from "react-i18next"
import { useAuth } from "@/features/auth/hooks/use-auth"
import { useMe } from "@/features/auth/hooks/use-me"
import { translateApiError } from "@/shared/lib/api-error"
import { Button } from "@/shared/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog"

/**
 * Bloqueia o app até o usuário reaceitar os Termos/Privacidade/Cookies após
 * uma atualização (backend sinaliza via `Me.termsAcceptanceRequired`). Montado
 * em toda área autenticada (AuthGuard) e também na página de aceite de
 * convite, que não passa pelo AuthGuard.
 */
export function TermsReacceptDialog() {
  // Namespace "common": é o único carregado via `makeI18nProps` em TODAS as
  // páginas autenticadas (AuthGuard) — "auth" só é carregado nas páginas de
  // login/signup, então não estaria disponível aqui.
  const { t } = useTranslation("common")
  const { me, acceptTerms } = useMe()
  const { signOut } = useAuth()
  const router = useRouter()
  const [submitting, setSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  // Isenta /account: é a única saída real para quem recusa o re-aceite
  // (exclusão de conta). Bloquear essa rota também deixaria o link
  // "encerrar minha conta" abaixo inútil — o dialog reapareceria por cima.
  if (!me?.termsAcceptanceRequired || router.pathname === "/account") return null

  // termsVersion null = usuário nunca aceitou nada (ex.: provisionado via login
  // social, ADR-0031 + login social) — copy de primeiro aceite, não "atualizamos
  // os termos". O restante do dialog (botão, sign-out, account, suporte, erro)
  // é compartilhado entre os dois casos.
  const isFirstAccept = me.termsVersion === null
  const titleKey = isFirstAccept ? "termsFirstAccept.title" : "termsReaccept.title"
  const descriptionKey = isFirstAccept
    ? "termsFirstAccept.description"
    : "termsReaccept.description"

  const handleAccept = async () => {
    setSubmitting(true)
    setError(null)
    try {
      await acceptTerms()
    } catch (err) {
      setError(err instanceof Error ? translateApiError(err, t) : t("termsReaccept.error"))
    } finally {
      setSubmitting(false)
    }
  }

  const handleSignOut = async () => {
    await signOut()
    await router.replace("/auth/login")
  }

  return (
    <Dialog open>
      <DialogContent
        showCloseButton={false}
        onEscapeKeyDown={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>{t(titleKey)}</DialogTitle>
          <DialogDescription>
            <Trans
              t={t}
              i18nKey={descriptionKey}
              components={{
                terms: (
                  <Link
                    href="/legal/termos-de-uso"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:text-orange-300"
                  />
                ),
                privacy: (
                  <Link
                    href="/legal/privacidade"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:text-orange-300"
                  />
                ),
                cookies: (
                  <Link
                    href="/legal/cookies"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:text-orange-300"
                  />
                ),
              }}
            />
          </DialogDescription>
        </DialogHeader>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <DialogFooter className="sm:flex-col sm:items-stretch sm:gap-3">
          <Button
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
            disabled={submitting}
            onClick={() => void handleAccept()}
          >
            {t("termsReaccept.acceptButton")}
          </Button>
          <div className="flex flex-col items-center gap-1.5 text-xs text-foreground/40">
            <button
              type="button"
              className="hover:text-foreground/70 hover:underline"
              onClick={() => void handleSignOut()}
            >
              {t("termsReaccept.signOutButton")}
            </button>
            <Link href="/account" className="hover:text-foreground/70 hover:underline">
              {t("termsReaccept.accountLink")}
            </Link>
            <a
              href="mailto:suporte@larmony.me"
              className="hover:text-foreground/70 hover:underline"
            >
              {t("termsReaccept.supportLink")}
            </a>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
