/**
 * i18n do Larmony (ADR-0018 + adendo 7 idiomas): pt-BR (default), en-US, es-ES,
 * zh-CN, de-DE, fr-FR, ja-JP.
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
 * `next-i18next.config.js` (JS lido no build, não importa TS), o `@IsIn` do
 * backend em `apps/backend/src/modules/auth/dto/update-me.dto.ts`, o catálogo
 * de notificações (`notification-locale.ts`) e o mapa date-fns em `format.ts`.
 */
export const SUPPORTED_LOCALES = [
  "pt-BR",
  "en-US",
  "es-ES",
  "zh-CN",
  "de-DE",
  "fr-FR",
  "ja-JP",
] as const
export type AppLocale = (typeof SUPPORTED_LOCALES)[number]
export const DEFAULT_LOCALE: AppLocale = "pt-BR"

/**
 * Tags legadas (pré-expansão para 7 idiomas) ainda vivas em cookies antigos e
 * rows de `users.locale` não migradas — normalizadas na leitura.
 */
const LEGACY_LOCALE_MAP: Record<string, AppLocale> = {
  en: "en-US",
  es: "es-ES",
}

/**
 * Rótulos endônimos (cada idioma no próprio idioma). Estático de propósito: o
 * seletor de idioma aparece em páginas públicas que não carregam o namespace
 * `common`, então rótulos via `t("locale.xx")` sairiam como chave crua.
 */
export const LOCALE_LABELS: Record<AppLocale, string> = {
  "pt-BR": "Português (Brasil)",
  "en-US": "English (US)",
  "es-ES": "Español",
  "zh-CN": "简体中文",
  "de-DE": "Deutsch",
  "fr-FR": "Français",
  "ja-JP": "日本語",
}

/** Cookie de detecção de locale do Next.js. */
export const LOCALE_COOKIE = "NEXT_LOCALE"

export function isAppLocale(value: unknown): value is AppLocale {
  return typeof value === "string" && (SUPPORTED_LOCALES as readonly string[]).includes(value)
}

/**
 * Garante um locale suportado: mapeia tags legadas (`en`→`en-US`, `es`→`es-ES`),
 * casa por idioma-base (`fr`, `de-AT`→`de-DE`...) e cai no default quando
 * ausente/inválido.
 */
export function normalizeLocale(locale: string | undefined | null): AppLocale {
  if (isAppLocale(locale)) return locale
  if (typeof locale !== "string" || locale.length === 0) return DEFAULT_LOCALE
  const legacy = LEGACY_LOCALE_MAP[locale]
  if (legacy) return legacy
  const base = locale.toLowerCase().split("-")[0]
  const byBase = SUPPORTED_LOCALES.find((l) => l.toLowerCase().startsWith(`${base}-`))
  return byBase ?? DEFAULT_LOCALE
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
