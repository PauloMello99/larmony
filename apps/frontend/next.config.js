import { withBetterStack } from "@logtail/next";

/**
 * i18n (ADR-0018): locale NÃO influencia a rota — sem prefixo `/en/`, `/es/`
 * etc. O roteamento nativo do Next.js (`i18n` neste config) fica desligado de
 * propósito; o locale ativo vem só do cookie `NEXT_LOCALE`, lido em
 * `shared/lib/i18n.ts` (`makeI18nProps`) e em `_document.tsx`. Ver
 * `next-i18next.config.js` para a lista de locales usada pelo next-i18next.
 */
/** @type {import('next').NextConfig} */
const nextConfig = {
  devIndicators: false,
};

export default withBetterStack(nextConfig);
