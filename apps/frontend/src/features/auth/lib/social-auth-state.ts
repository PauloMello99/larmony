export type SocialProviderState = "google" | "apple"

export interface SocialAuthState {
  provider: SocialProviderState
  /** Anti login-CSRF: gerado em startSocialSignIn, comparado (ou apenas exigida a presença) no callback. Sem isso, um atacante que force a vítima a abrir /auth/callback#access_token=<tokens do atacante> a logaria silenciosamente na conta do atacante. */
  nonce: string
  invite?: string
  redirect?: string
}

const KEY = "larmony_social_auth"

export function saveSocialAuthState(state: SocialAuthState): void {
  if (typeof window === "undefined") return
  sessionStorage.setItem(KEY, JSON.stringify(state))
}

/** Lê e REMOVE (one-shot) — um callback não solicitado não encontra nada. */
export function takeSocialAuthState(): SocialAuthState | null {
  if (typeof window === "undefined") return null
  const raw = sessionStorage.getItem(KEY)
  sessionStorage.removeItem(KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as SocialAuthState
  } catch {
    return null
  }
}

/** Mesma regra de sanitização do GuestGuard: só path interno, nunca protocol-relative. */
export function sanitizeInternalRedirect(redirect: string | undefined): string | null {
  if (!redirect) return null
  if (redirect.startsWith("/") && !redirect.startsWith("//")) return redirect
  return null
}
