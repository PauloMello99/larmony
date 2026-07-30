import type { AppLocale } from "@/shared/lib/locale"

export interface AuthUser {
  id: string
  email: string
  emailVerified: boolean
}

/** Perfil completo do usuário (GET /auth/me). */
export interface Me {
  id: string
  authId: string
  platformRole: "super_admin" | "user"
  name: string
  email: string
  phone: string | null
  avatarUrl: string | null
  birthDate: string | null
  gender: "male" | "female" | "other" | null
  locale: AppLocale
  /** Tours de onboarding concluídos: { [tourKey]: maiorVersãoVista }. */
  onboarding: Record<string, number>
  createdAt: string
  updatedAt: string
  termsAcceptedAt: string | null
  termsVersion: string | null
  termsAcceptanceRequired: boolean
}

export interface AuthSession {
  accessToken: string
  refreshToken: string
  expiresAt: number
  user: AuthUser
}

export interface StoredSession {
  accessToken: string
  refreshToken: string
  expiresAt: number
  user: AuthUser
}

export type SocialProvider = "google" | "apple"

export interface SocialAuthorizeResponse {
  url: string
}

export interface SocialSession extends AuthSession {
  isNewUser: boolean
}

export interface AuthContextValue {
  user: AuthUser | null
  loading: boolean
  signUp: (
    name: string,
    email: string,
    password: string,
    termsAccepted: boolean,
  ) => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  forgotPassword: (email: string) => Promise<void>
  resetPassword: (
    accessToken: string,
    newPassword: string,
    refreshToken?: string,
  ) => Promise<void>
  startSocialSignIn: (
    provider: SocialProvider,
    opts?: { invite?: string; redirect?: string },
  ) => Promise<void>
  completeSocialSignIn: (payload: {
    accessToken: string
    refreshToken: string
    expiresAt: number
    socialProvider: SocialProvider
  }) => Promise<boolean>
}
