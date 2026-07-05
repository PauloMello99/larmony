/**
 * i18n do Larmony (ADR-0018): pt-BR (default) + en.
 * Locale do usuário persiste em users.locale (PATCH /auth/me).
 * Namespaces por feature; "common" é o compartilhado.
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
