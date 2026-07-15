/**
 * i18n do Larmony (ADR-0018 + adendo): pt-BR (default), en-US, es-ES, zh-CN,
 * de-DE, fr-FR, ja-JP.
 * Locale do usuário persiste em users.locale (PATCH /auth/me) + cookie NEXT_LOCALE.
 * Namespaces por feature; "common" é o compartilhado.
 *
 * O locale NÃO influencia a rota (sem prefixo `/en/`, `/es/`) — o roteamento
 * nativo de i18n do Next.js está desligado (`next.config.js` não tem `i18n`).
 * Este arquivo só documenta a config para o `next-i18next` (namespaces,
 * localePath); `shared/lib/i18n.ts` monta sua própria config inline para
 * `serverSideTranslations` (ESM não serializa o import direto deste .js).
 *
 * ⚠️ Fonte única da lista de locales: src/shared/lib/locale.ts
 * (SUPPORTED_LOCALES / DEFAULT_LOCALE). Este .js não importa TS, então precisa
 * espelhar aqueles valores manualmente.
 */
/** @type {import('next-i18next').UserConfig} */
const config = {
  i18n: {
    defaultLocale: "pt-BR",
    locales: ["pt-BR", "en-US", "es-ES", "zh-CN", "de-DE", "fr-FR", "ja-JP"],
  },
  defaultNS: "common",
  localePath: "./public/locales",
};

export default config;
