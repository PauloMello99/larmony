"use client"

import * as React from "react"
import { useRouter } from "next/router"
import { useTranslation, Trans } from "react-i18next"
import { Loader2 } from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card"
import { Button } from "@/shared/components/ui/button"
import { useAuth } from "@/features/auth/hooks/use-auth"
import { translateApiError } from "@/shared/lib/api-error"
import {
  useInvitationLookup,
  useAcceptInvitation,
  useDeclineInvitation,
} from "../hooks/use-invitation"

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm border-foreground/5 bg-foreground/[0.03]">{children}</Card>
    </div>
  )
}

function Spinner() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Loader2 className="h-6 w-6 animate-spin text-foreground/30" />
    </div>
  )
}

export function AcceptInvitationPage() {
  const { t } = useTranslation("invitations")
  const { t: tCommon } = useTranslation("common")
  const router = useRouter()
  const token =
    typeof router.query.token === "string" ? router.query.token : undefined

  const { user, loading: authLoading, signOut } = useAuth()
  const { data: invite, isLoading, error } = useInvitationLookup(token)
  const { acceptInvitation, accepting } = useAcceptInvitation()
  const { declineInvitation, declining } = useDeclineInvitation()
  const [acceptError, setAcceptError] = React.useState<string | null>(null)

  // Sem login → manda para login/cadastro carregando o token; volta para cá depois.
  React.useEffect(() => {
    if (!router.isReady || authLoading || isLoading) return
    if (!invite || invite.status !== "pending" || invite.expired) return
    if (!user && token) {
      const dest = invite.hasAccount ? "/auth/login" : "/auth/signup"
      const qs = `invite=${encodeURIComponent(token)}&email=${encodeURIComponent(invite.email)}`
      void router.replace(`${dest}?${qs}`)
    }
  }, [router, authLoading, isLoading, invite, user, token])

  if (!router.isReady || authLoading || isLoading) return <Spinner />

  if (!token || error || !invite) {
    return (
      <Centered>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">{t("invalid.title")}</CardTitle>
          <CardDescription className="text-foreground/40">
            {t("invalid.description")}
          </CardDescription>
        </CardHeader>
      </Centered>
    )
  }

  if (invite.status !== "pending" || invite.expired) {
    const reason =
      invite.status === "accepted"
        ? t("unavailable.accepted")
        : invite.status === "cancelled"
          ? t("unavailable.cancelled")
          : t("unavailable.expired")
    return (
      <Centered>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">{t("unavailable.title")}</CardTitle>
          <CardDescription className="text-foreground/40">{reason}</CardDescription>
        </CardHeader>
        <CardFooter>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => void router.replace("/households")}
          >
            {t("unavailable.goToDashboard")}
          </Button>
        </CardFooter>
      </Centered>
    )
  }

  // Aguardando o redirect para login/cadastro.
  if (!user) return <Spinner />

  const inviteEmail = invite.email
  const emailMismatch = user.email.toLowerCase() !== inviteEmail.toLowerCase()

  async function handleSwitchAccount() {
    await signOut()
    if (token) {
      const qs = `invite=${encodeURIComponent(token)}&email=${encodeURIComponent(inviteEmail)}`
      void router.replace(`/auth/login?${qs}`)
    }
  }

  async function handleAccept() {
    if (!token) return
    setAcceptError(null)
    try {
      const res = await acceptInvitation(token)
      void router.replace(`/households/${res.householdSlug}`)
    } catch (err) {
      setAcceptError(
        err instanceof Error
          ? translateApiError(err, tCommon)
          : t("accept.acceptError"),
      )
    }
  }

  // Recusar remove o convite (o owner pode reenviar). Volta para as lares.
  async function handleDecline() {
    if (!token) return
    setAcceptError(null)
    try {
      await declineInvitation(token)
      void router.replace("/households")
    } catch (err) {
      setAcceptError(
        err instanceof Error
          ? translateApiError(err, tCommon)
          : t("accept.declineError"),
      )
    }
  }

  return (
    <Centered>
      <CardHeader className="text-center">
        <div className="mb-2 text-xl font-bold">
          <span className="text-primary">lar</span>mony
        </div>
        <CardTitle className="text-xl">
          {t("accept.title", { householdName: invite.householdName })}
        </CardTitle>
        <CardDescription className="text-foreground/40">
          <Trans
            t={t}
            i18nKey="accept.invitedAs"
            values={{ role: t(`roles.${invite.role}`) }}
            components={{ span: <span className="text-foreground/70" /> }}
          />
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-3">
        {acceptError && (
          <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {acceptError}
          </p>
        )}
        {emailMismatch ? (
          <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-300">
            <Trans
              t={t}
              i18nKey="accept.emailMismatch"
              values={{ inviteEmail: invite.email, userEmail: user.email }}
              components={{ strong: <strong /> }}
            />
          </div>
        ) : (
          <p className="text-center text-sm text-foreground/50">
            <Trans
              t={t}
              i18nKey="accept.acceptingAs"
              values={{ email: user.email }}
              components={{ span: <span className="text-foreground/80" /> }}
            />
          </p>
        )}
      </CardContent>

      <CardFooter className="flex flex-col gap-2">
        {emailMismatch ? (
          <Button
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={() => void handleSwitchAccount()}
          >
            {t("accept.switchAccount")}
          </Button>
        ) : (
          <>
            <Button
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
              disabled={accepting || declining}
              onClick={() => void handleAccept()}
            >
              {accepting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("accept.submit")}
            </Button>
            <Button
              variant="ghost"
              className="w-full text-foreground/50 hover:text-foreground"
              disabled={accepting || declining}
              onClick={() => void handleDecline()}
            >
              {declining && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("accept.decline")}
            </Button>
          </>
        )}
      </CardFooter>
    </Centered>
  )
}
