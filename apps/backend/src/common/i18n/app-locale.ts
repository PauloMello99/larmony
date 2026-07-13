/**
 * Locales suportados pelo produto (fonte no frontend:
 * `apps/frontend/src/shared/lib/locale.ts` — espelho manual, ver comentário lá).
 * Compartilhado pelos catálogos de notificações e de e-mail (render-at-send no
 * idioma do destinatário, ADR-0018 + adendo 7 idiomas).
 */
export type AppLocale =
  | "pt-BR"
  | "en-US"
  | "es-ES"
  | "zh-CN"
  | "de-DE"
  | "fr-FR"
  | "ja-JP";

export const SUPPORTED_APP_LOCALES: readonly AppLocale[] = [
  "pt-BR",
  "en-US",
  "es-ES",
  "zh-CN",
  "de-DE",
  "fr-FR",
  "ja-JP",
];

export const DEFAULT_APP_LOCALE: AppLocale = "pt-BR";

/** Tags legadas (pré-7-idiomas) ainda possíveis em rows antigas de users.locale. */
const LEGACY: Record<string, AppLocale> = { en: "en-US", es: "es-ES" };

/**
 * Garante um locale suportado: tag exata → legado (`en`/`es`) → idioma-base
 * (`de-AT`→`de-DE`) → default pt-BR.
 */
export function normalizeAppLocale(value: string | null | undefined): AppLocale {
  if ((SUPPORTED_APP_LOCALES as readonly string[]).includes(value ?? "")) {
    return value as AppLocale;
  }
  if (!value) return DEFAULT_APP_LOCALE;
  const legacy = LEGACY[value];
  if (legacy) return legacy;
  const base = value.toLowerCase().split("-")[0];
  return (
    SUPPORTED_APP_LOCALES.find((l) => l.toLowerCase().startsWith(`${base}-`)) ??
    DEFAULT_APP_LOCALE
  );
}
