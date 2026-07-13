import { Component, type ErrorInfo, type ReactNode } from "react"
import { Button } from "@/shared/components/ui/button"
import { captureError } from "@/infrastructure/telemetry/telemetry"
import { readLocaleCookie, type AppLocale } from "@/shared/lib/locale"

/**
 * O ErrorBoundary envolve o app INTEIRO em `_app.tsx` — fica FORA do provider
 * do next-i18next, então `useTranslation` não funciona aqui. Padrão de
 * dicionário estático nos 7 idiomas (mesma rationale de LOCALE_LABELS em
 * shared/lib/locale.ts), resolvido do cookie NEXT_LOCALE no momento do erro
 * (o fallback só renderiza no cliente — error boundaries não rodam no SSR).
 */
const COPY: Record<
  AppLocale,
  { title: string; description: string; retry: string; reload: string }
> = {
  "pt-BR": {
    title: "Algo deu errado",
    description: "Encontramos um erro inesperado. Nossa equipe já foi notificada.",
    retry: "Tentar novamente",
    reload: "Recarregar página",
  },
  "en-US": {
    title: "Something went wrong",
    description: "We ran into an unexpected error. Our team has been notified.",
    retry: "Try again",
    reload: "Reload page",
  },
  "es-ES": {
    title: "Algo salió mal",
    description: "Encontramos un error inesperado. Nuestro equipo ya fue notificado.",
    retry: "Intentar de nuevo",
    reload: "Recargar página",
  },
  "zh-CN": {
    title: "出错了",
    description: "我们遇到了意外错误。我们的团队已收到通知。",
    retry: "重试",
    reload: "重新加载页面",
  },
  "de-DE": {
    title: "Etwas ist schiefgelaufen",
    description: "Ein unerwarteter Fehler ist aufgetreten. Unser Team wurde benachrichtigt.",
    retry: "Erneut versuchen",
    reload: "Seite neu laden",
  },
  "fr-FR": {
    title: "Une erreur est survenue",
    description: "Nous avons rencontré une erreur inattendue. Notre équipe a été notifiée.",
    retry: "Réessayer",
    reload: "Recharger la page",
  },
  "ja-JP": {
    title: "エラーが発生しました",
    description: "予期しないエラーが発生しました。チームに通知済みです。",
    retry: "再試行",
    reload: "ページを再読み込み",
  },
}

interface ErrorBoundaryProps {
  children: ReactNode
  /** Identifica a região da árvore que falhou no error tracking. */
  module?: string
  /** UI alternativa; se ausente, renderiza o fallback padrão. */
  fallback?: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
}

/**
 * Captura erros de renderização do React (que escapam a try/catch e aos
 * handlers globais) e os reporta ao Better Stack via captureError, exibindo um
 * fallback ao invés de uma tela branca.
 */
export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    captureError(error, {
      source: "react-render",
      module: this.props.module ?? "global",
      componentStack: info.componentStack,
    })
  }

  private reset = (): void => {
    this.setState({ hasError: false })
  }

  render(): ReactNode {
    if (!this.state.hasError) return this.props.children
    if (this.props.fallback) return this.props.fallback

    const copy = COPY[readLocaleCookie()]

    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-4 text-center sm:p-6">
        <div className="space-y-2">
          <h1 className="text-xl font-semibold sm:text-2xl">
            {copy.title}
          </h1>
          <p className="text-sm text-muted-foreground">
            {copy.description}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={this.reset}>
            {copy.retry}
          </Button>
          <Button onClick={() => window.location.reload()}>
            {copy.reload}
          </Button>
        </div>
      </div>
    )
  }
}
