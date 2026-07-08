/**
 * Formatação sensível ao locale (ADR-0018). Datas e números seguem o locale
 * ATIVO do router (fica em sincronia com as strings do i18n). A MOEDA continua
 * fixa em BRL (ver shared/lib/currency.ts) — o Larmony é um produto brasileiro.
 */
import { useRouter } from "next/router"
import { normalizeLocale, type AppLocale } from "./locale"

/** Locale ativo do Next.js (rota), normalizado para um locale suportado. */
export function useActiveLocale(): AppLocale {
  const { locale } = useRouter()
  return normalizeLocale(locale)
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
