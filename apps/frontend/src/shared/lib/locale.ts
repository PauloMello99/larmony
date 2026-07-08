/**
 * i18n do Larmony (ADR-0018): pt-BR (default) + en.
 *
 * O locale persiste em duas camadas:
 *  - `users.locale` (fonte de verdade, via PATCH /auth/me) — o idioma do perfil.
 *  - cookie `NEXT_LOCALE` — o que o Next.js honra na *detecção* de locale a cada
 *    request. Sem ele, uma navegação para rota não-prefixada cai no defaultLocale
 *    (pt-BR)/Accept-Language e o idioma escolhido "some" no reload.
 *
 * `useLocaleSync` (features/auth) reconcilia as duas camadas após o login.
 */
export const SUPPORTED_LOCALES = ["pt-BR", "en"] as const
export type AppLocale = (typeof SUPPORTED_LOCALES)[number]
export const DEFAULT_LOCALE: AppLocale = "pt-BR"

/** Cookie de detecção de locale do Next.js. */
export const LOCALE_COOKIE = "NEXT_LOCALE"

export function isAppLocale(value: unknown): value is AppLocale {
  return typeof value === "string" && (SUPPORTED_LOCALES as readonly string[]).includes(value)
}

/** Garante um locale suportado, caindo no default quando ausente/inválido. */
export function normalizeLocale(locale: string | undefined | null): AppLocale {
  return isAppLocale(locale) ? locale : DEFAULT_LOCALE
}

/**
 * Persiste o locale no cookie `NEXT_LOCALE` (1 ano, path raiz). O Next.js passa a
 * honrar esse idioma na detecção de locale — sobrevive a reload e navegação.
 */
export function setLocaleCookie(locale: AppLocale): void {
  if (typeof document === "undefined") return
  const oneYearInSeconds = 60 * 60 * 24 * 365
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=${oneYearInSeconds}; samesite=lax`
}
