import NextDocument, {
  Html,
  Head,
  Main,
  NextScript,
  type DocumentContext,
  type DocumentInitialProps,
} from "next/document";
import { LOCALE_COOKIE, normalizeLocale, type AppLocale } from "@/shared/lib/locale";

interface Props extends DocumentInitialProps {
  lang: AppLocale;
}

/**
 * O locale não influencia a rota (sem prefixo `/en/`, `/es/` — ver
 * next.config.js), então `__NEXT_DATA__.locale` nunca é definido pelo Next.js.
 * Lemos o cookie `NEXT_LOCALE` direto do header aqui (getInitialProps do
 * Document roda antes do HTML ser montado) para o `<html lang>` sair correto.
 */
function readLocaleCookie(cookieHeader: string | undefined): string | undefined {
  if (!cookieHeader) return undefined;
  const pair = cookieHeader
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${LOCALE_COOKIE}=`));
  return pair?.slice(LOCALE_COOKIE.length + 1);
}

export default function Document({ lang }: Props) {
  return (
    <Html lang={lang} suppressHydrationWarning>
      <Head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" type="image/svg+xml" href="/icon.svg" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/site.webmanifest" />
        <meta name="theme-color" content="#0d0d0f" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}

Document.getInitialProps = async (ctx: DocumentContext): Promise<Props> => {
  const initialProps = await NextDocument.getInitialProps(ctx);
  const lang = normalizeLocale(readLocaleCookie(ctx.req?.headers.cookie));
  return { ...initialProps, lang };
};
