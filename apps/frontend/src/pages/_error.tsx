import type { ReactElement } from "react"
import { useEffect, useState } from "react"
import type { NextPageContext } from "next"
import Link from "next/link"
import NextErrorComponent from "next/error"
import { log } from "@logtail/next"
import { captureError } from "@/infrastructure/telemetry/telemetry"
import { DEFAULT_LOCALE, readLocaleCookie, type AppLocale } from "@/shared/lib/locale"

interface ErrorPageProps {
  statusCode: number
}

/**
 * Como na 404, o next-i18next não está disponível aqui (a página de erro roda
 * fora do fluxo normal de data-fetching e o cookie não chega ao getStaticProps)
 * — padrão de dicionário estático nos 7 idiomas, resolvido no cliente a partir
 * do cookie NEXT_LOCALE (SSR renderiza pt-BR).
 */
const COPY: Record<AppLocale, { title: string; description: string; back: string }> = {
  "pt-BR": {
    title: "Algo deu errado",
    description: "Ocorreu um erro inesperado. Tente novamente em instantes.",
    back: "Voltar ao início",
  },
  "en-US": {
    title: "Something went wrong",
    description: "An unexpected error occurred. Please try again shortly.",
    back: "Back to home",
  },
  "es-ES": {
    title: "Algo salió mal",
    description: "Ocurrió un error inesperado. Inténtalo de nuevo en unos instantes.",
    back: "Volver al inicio",
  },
  "zh-CN": {
    title: "出错了",
    description: "发生了意外错误。请稍后重试。",
    back: "返回首页",
  },
  "de-DE": {
    title: "Etwas ist schiefgelaufen",
    description: "Ein unerwarteter Fehler ist aufgetreten. Bitte versuche es gleich erneut.",
    back: "Zur Startseite",
  },
  "fr-FR": {
    title: "Une erreur est survenue",
    description: "Une erreur inattendue s'est produite. Veuillez réessayer dans un instant.",
    back: "Retour à l'accueil",
  },
  "ja-JP": {
    title: "エラーが発生しました",
    description: "予期しないエラーが発生しました。しばらくしてからもう一度お試しください。",
    back: "ホームに戻る",
  },
}

/**
 * Página de erro custom do Pages Router. O getInitialProps reporta o erro ao
 * Better Stack — cobrindo erros de SSR e de navegação client-side que não
 * passam por um error boundary.
 */
function ErrorPage({ statusCode }: ErrorPageProps): ReactElement {
  const [locale, setLocale] = useState<AppLocale>(DEFAULT_LOCALE)

  // Cookie lido em useEffect (não no render) para casar com o HTML do servidor
  // e evitar mismatch de hidratação.
  useEffect(() => {
    setLocale(readLocaleCookie())
  }, [])

  const copy = COPY[locale]

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-4 text-center">
      <div className="space-y-2">
        <p className="text-4xl font-bold tabular-nums">{statusCode}</p>
        <h1 className="text-xl font-semibold sm:text-2xl">{copy.title}</h1>
        <p className="text-sm text-muted-foreground">{copy.description}</p>
      </div>
      <Link href="/" className="text-sm font-medium text-primary hover:underline">
        {copy.back}
      </Link>
    </div>
  )
}

ErrorPage.getInitialProps = async (
  ctx: NextPageContext,
): Promise<ErrorPageProps> => {
  const errorProps = await NextErrorComponent.getInitialProps(ctx)
  const { err, req } = ctx

  if (err) {
    captureError(err, {
      source: "next-error-page",
      module: "global",
      statusCode: errorProps.statusCode,
      path: req?.url ?? ctx.asPath ?? null,
    })
    // No servidor o envio é em batch — garanta o flush antes de responder.
    if (typeof window === "undefined") await log.flush()
  }

  return { statusCode: errorProps.statusCode }
}

// Sem layout — página de erro bare.
ErrorPage.getLayout = (page: ReactElement) => page

export default ErrorPage
