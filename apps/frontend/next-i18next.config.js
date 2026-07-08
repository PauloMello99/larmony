/**
 * i18n do Larmony (ADR-0018): pt-BR (default) + en.
 * Locale do usuário persiste em users.locale (PATCH /auth/me) + cookie NEXT_LOCALE.
 * Namespaces por feature; "common" é o compartilhado.
 *
 * ⚠️ Fonte única da lista de locales: src/shared/lib/locale.ts
 * (SUPPORTED_LOCALES / DEFAULT_LOCALE). Este .js é lido pelo next.config.js em
 * build e não importa TS, então precisa espelhar aqueles valores manualmente.
 */
/** @type {import('next-i18next').UserConfig} */
const config = {
  i18n: {
    defaultLocale: "pt-BR",
    locales: ["pt-BR", "en"],
  },
  defaultNS: "common",
  localePath: "./public/locales",
};

export default config;
