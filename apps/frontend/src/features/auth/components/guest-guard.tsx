"use client"

import * as React from "react"
import { useRouter } from "next/router"
import { Loader2 } from "lucide-react"
import { useAuth } from "@/features/auth/hooks/use-auth"

interface GuestGuardProps {
  children: React.ReactNode
  /**
   * Não redireciona se a URL carrega um token de recuperação de senha
   * (query OU hash — o Supabase manda no hash). Um usuário logado pode
   * estar redefinindo a senha por link de e-mail.
   */
  allowRecoveryToken?: boolean
}

/** True se a URL atual carrega token de recovery (?/# access_token+type=recovery ou token=). */
function hasRecoveryToken(): boolean {
  if (typeof window === "undefined") return false
  const sources = [
    window.location.search.replace(/^\?/, ""),
    window.location.hash.replace(/^#/, ""),
  ]
  for (const src of sources) {
    const params = new URLSearchParams(src)
    if (params.get("token")) return true
    if (params.get("access_token") && params.get("type") === "recovery") return true
  }
  return false
}

/**
 * Inverso do AuthGuard: rotas de auth (login/signup/recover/reset) não fazem
 * sentido para quem já está logado — redireciona para o dashboard, preservando
 * o fluxo de convite (?invite=) e um ?redirect= interno opcional.
 */
export function GuestGuard({ children, allowRecoveryToken = false }: GuestGuardProps) {
  const { user, loading } = useAuth()
  const router = useRouter()

  const allowedByToken = allowRecoveryToken && hasRecoveryToken()

  React.useEffect(() => {
    if (!router.isReady || loading || !user || allowedByToken) return

    const invite = router.query.invite
    if (typeof invite === "string" && invite) {
      void router.replace(`/invite/accept?token=${encodeURIComponent(invite)}`)
      return
    }

    const redirect = router.query.redirect
    if (typeof redirect === "string" && redirect.startsWith("/") && !redirect.startsWith("//")) {
      void router.replace(redirect)
      return
    }

    // Onboarding (M1b): quem acabou de se cadastrar (sem convite/redirect) ganha
    // o Sheet de criar o primeiro lar já aberto na lista.
    const isFreshSignup = router.pathname === "/auth/signup"
    void router.replace(
      isFreshSignup ? "/dashboard/households?welcome=1" : "/dashboard/households",
    )
  }, [router, router.isReady, user, loading, allowedByToken])

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-foreground/30" />
      </div>
    )
  }

  if (user && !allowedByToken) return null

  return <>{children}</>
}
