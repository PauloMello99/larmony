import { Html, Head, Main, NextScript, type DocumentProps } from "next/document";

export default function Document(props: DocumentProps) {
  // O locale ativo é injetado pelo Next.js no __NEXT_DATA__; cai para pt-BR.
  const lang = props.__NEXT_DATA__?.locale ?? "pt-BR";
  return (
    <Html lang={lang} suppressHydrationWarning>
      <Head />
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
