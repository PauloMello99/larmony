/**
 * Formatação sensível ao locale (ADR-0018). Datas e números seguem o locale
 * ATIVO do i18next (fica em sincronia com as strings do i18n). A MOEDA continua
 * fixa em BRL (ver shared/lib/currency.ts) — o Larmony é um produto brasileiro.
 *
 * Lido de `i18n.language`, não de `router.locale` — o locale não influencia a
 * rota (sem prefixo `/en/`, `/es/`), então `router.locale` nunca é definido.
 */
import { useTranslation } from "react-i18next"
import { ptBR, enUS, es } from "date-fns/locale"
import type { Locale } from "date-fns"
import { normalizeLocale, type AppLocale } from "./locale"

/** Locale ativo do i18next, normalizado para um locale suportado. */
export function useActiveLocale(): AppLocale {
  const { i18n } = useTranslation()
  return normalizeLocale(i18n.language)
}

/** Mapa AppLocale → locale do date-fns (para format/formatDistanceToNow etc.). */
const DATE_FNS_LOCALES: Record<AppLocale, Locale> = {
  "pt-BR": ptBR,
  en: enUS,
  es,
}

export function getDateFnsLocale(locale: AppLocale): Locale {
  return DATE_FNS_LOCALES[locale]
}

/** Nome do mês (0–11) no locale ativo — substitui arrays hardcoded de 12 meses. */
export function monthName(
  monthIndex: number,
  locale: AppLocale,
  style: "long" | "short" = "long",
): string {
  return new Intl.DateTimeFormat(locale, { month: style }).format(new Date(2000, monthIndex, 1))
}

/** Formata uma data no locale informado. */
export function formatDate(
  date: Date | string | number,
  locale: AppLocale,
  options: Intl.DateTimeFormatOptions,
): string {
  const value = date instanceof Date ? date : new Date(date)
  return new Intl.DateTimeFormat(locale, options).format(value)
}

/** Formata um número no locale informado. */
export function formatNumber(
  value: number,
  locale: AppLocale,
  options?: Intl.NumberFormatOptions,
): string {
  return new Intl.NumberFormat(locale, options).format(value)
}
