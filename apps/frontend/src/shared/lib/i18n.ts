import type { GetServerSideProps } from "next"
import { serverSideTranslations } from "next-i18next/pages/serverSideTranslations"
import { DEFAULT_LOCALE, LOCALE_COOKIE, SUPPORTED_LOCALES, normalizeLocale } from "@/shared/lib/locale"

/**
 * Config passada EXPLICITAMENTE ao serverSideTranslations: o auto-load do
 * next-i18next.config.js (ESM) devolve um Module namespace que não é
 * JSON-serializável e quebra o getServerSideProps.
 *
 * A lista de locales vem de `shared/lib/locale.ts` (fonte única). Ao mudar os
 * idiomas, atualize `SUPPORTED_LOCALES`/`DEFAULT_LOCALE` lá — o único ponto que
 * ainda precisa espelhar manualmente é `next-i18next.config.js` (lido pelo
 * next.config.js em build; não importa TS).
 */
const I18N_CONFIG = {
  i18n: {
    defaultLocale: DEFAULT_LOCALE,
    locales: [...SUPPORTED_LOCALES],
  },
  defaultNS: "common",
  localePath: "./public/locales",
  // Chaves novas nascem só em pt-BR (tradução manual posterior): en/es caem no
  // texto pt-BR em runtime em vez de exibir a chave crua. O serverSideTranslations
  // carrega também os bundles do fallback.
  fallbackLng: DEFAULT_LOCALE,
  // Em dev, relê os JSONs de locale a cada render (sem isso o next-i18next serve
  // bundles cacheados e edições nos .json exigem restart do servidor).
  reloadOnPrerender: process.env.NODE_ENV === "development",
}

/**
 * getServerSideProps que carrega os namespaces de tradução da página.
 * Uso: `export const getServerSideProps = makeI18nProps(["common", "dashboard"])`.
 *
 * O locale é lido do cookie `NEXT_LOCALE` (não de `context.locale`) — o
 * roteamento nativo de i18n do Next.js está desligado de propósito, então
 * `context.locale` nunca é definido (ver next.config.js).
 */
export function makeI18nProps(namespaces: string[] = ["common"]): GetServerSideProps {
  return async ({ req }) => ({
    props: await serverSideTranslations(
      normalizeLocale(req.cookies[LOCALE_COOKIE]),
      namespaces,
      I18N_CONFIG,
    ),
  })
}
