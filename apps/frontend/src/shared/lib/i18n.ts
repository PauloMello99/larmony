import type { GetServerSideProps } from "next"
import { serverSideTranslations } from "next-i18next/pages/serverSideTranslations"
import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from "@/shared/lib/locale"

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
}

/**
 * getServerSideProps que carrega os namespaces de tradução da página.
 * Uso: `export const getServerSideProps = makeI18nProps(["common", "dashboard"])`.
 */
export function makeI18nProps(namespaces: string[] = ["common"]): GetServerSideProps {
  return async ({ locale }) => ({
    props: await serverSideTranslations(locale ?? DEFAULT_LOCALE, namespaces, I18N_CONFIG),
  })
}
