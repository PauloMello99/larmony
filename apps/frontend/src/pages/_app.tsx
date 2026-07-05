import { useEffect } from "react"
import type { AppProps } from "next/app"
import type { NextPage } from "next"
import type { ReactElement, ReactNode } from "react"
import { appWithTranslation } from "next-i18next/pages"
import { AppProviders } from "@/providers"
import { ErrorBoundary } from "@/shared/components/error-boundary"
import { installGlobalErrorHandlers } from "@/infrastructure/telemetry/telemetry"
import "@/styles/globals.css"

// Allow pages to declare a custom layout via getLayout
export type NextPageWithLayout<P = object, IP = P> = NextPage<P, IP> & {
  getLayout?: (page: ReactElement) => ReactNode
}

type AppPropsWithLayout = AppProps & {
  Component: NextPageWithLayout
}

function App({ Component, pageProps }: AppPropsWithLayout) {
  const getLayout = Component.getLayout ?? ((page) => page)

  // Captura erros globais não tratados (window.onerror / unhandledrejection).
  useEffect(() => {
    installGlobalErrorHandlers()
  }, [])

  return (
    <ErrorBoundary>
      <AppProviders>{getLayout(<Component {...pageProps} />)}</AppProviders>
    </ErrorBoundary>
  )
}

// i18n (ADR-0018): pt-BR default + en; strings novas SEMPRE via useTranslation.
export default appWithTranslation(App)
