import type { GetServerSideProps } from "next"
import { serverSideTranslations } from "next-i18next/pages/serverSideTranslations"

/**
 * Config passada EXPLICITAMENTE ao serverSideTranslations: o auto-load do
 * next-i18next.config.js (ESM) devolve um Module namespace que não é
 * JSON-serializável e quebra o getServerSideProps. Manter em sincronia com
 * apps/frontend/next-i18next.config.js.
 */
const I18N_CONFIG = {
  i18n: {
    defaultLocale: "pt-BR",
    locales: ["pt-BR", "en"],
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
    props: await serverSideTranslations(locale ?? "pt-BR", namespaces, I18N_CONFIG),
  })
}
