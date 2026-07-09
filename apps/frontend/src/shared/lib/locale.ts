/**
 * i18n do Larmony (ADR-0018): pt-BR (default) + en + es.
 *
 * O locale persiste em duas camadas:
 *  - `users.locale` (fonte de verdade, via PATCH /auth/me) — o idioma do perfil.
 *  - cookie `NEXT_LOCALE` — o que o Next.js honra na *detecção* de locale a cada
 *    request. Sem ele, uma navegação para rota não-prefixada cai no defaultLocale
 *    (pt-BR)/Accept-Language e o idioma escolhido "some" no reload.
 *
 * `useLocaleSync` (features/auth) reconcilia as duas camadas após o login.
 *
 * ⚠️ Fonte única da lista de locales. Ao adicionar um idioma, atualize também
 * `next-i18next.config.js` (JS lido no build, não importa TS) e o `@IsIn` do
 * backend em `apps/backend/src/modules/auth/dto/update-me.dto.ts`.
 */
export const SUPPORTED_LOCALES = ["pt-BR", "en", "es"] as const
export type AppLocale = (typeof SUPPORTED_LOCALES)[number]
export const DEFAULT_LOCALE: AppLocale = "pt-BR"

/**
 * Rótulos endônimos (cada idioma no próprio idioma). Estático de propósito: o
 * seletor de idioma aparece em páginas públicas que não carregam o namespace
 * `common`, então rótulos via `t("locale.xx")` sairiam como chave crua.
 */
export const LOCALE_LABELS: Record<AppLocale, string> = {
  "pt-BR": "Português (Brasil)",
  en: "English",
  es: "Español",
}

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

/**
 * Sequência canônica de troca de idioma (usada pelo LocaleSwitcher, LocaleSection
 * e user-menu): cookie → persistência opcional (ex.: `updateMe({ locale })` em
 * contexto autenticado) → reload no MESMO caminho. O locale não influencia a rota
 * (sem prefixo `/en/`); o reload garante que o SSR relê o cookie via
 * `makeI18nProps`/`_document` em qualquer página, mesmo sem data-fetching próprio.
 */
export async function applyLocale(
  locale: AppLocale,
  persist?: (locale: AppLocale) => Promise<void> | void,
): Promise<void> {
  setLocaleCookie(locale)
  await persist?.(locale)
  window.location.reload()
}
