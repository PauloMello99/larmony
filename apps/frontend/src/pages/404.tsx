import type { ReactElement } from "react"
import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/router"
import { DEFAULT_LOCALE, readLocaleCookie, type AppLocale } from "@/shared/lib/locale"

/**
 * O Next.js NÃO permite getServerSideProps na 404, e o cookie NEXT_LOCALE não
 * existe em getStaticProps — então o next-i18next fica indisponível aqui.
 * Usamos o padrão de dicionário estático (mesma rationale de LOCALE_LABELS em
 * shared/lib/locale.ts): strings locais nos 7 idiomas, resolvidas no cliente a
 * partir do cookie (SSR renderiza pt-BR).
 */
const COPY: Record<AppLocale, { title: string; description: string; back: string }> = {
  "pt-BR": {
    title: "Página não encontrada",
    description: "A página que você procura não existe ou foi movida.",
    back: "Voltar ao início",
  },
  "en-US": {
    title: "Page not found",
    description: "The page you are looking for does not exist or has been moved.",
    back: "Back to home",
  },
  "es-ES": {
    title: "Página no encontrada",
    description: "La página que buscas no existe o fue movida.",
    back: "Volver al inicio",
  },
  "zh-CN": {
    title: "页面未找到",
    description: "您要找的页面不存在或已被移动。",
    back: "返回首页",
  },
  "de-DE": {
    title: "Seite nicht gefunden",
    description: "Die gesuchte Seite existiert nicht oder wurde verschoben.",
    back: "Zur Startseite",
  },
  "fr-FR": {
    title: "Page introuvable",
    description: "La page que vous cherchez n'existe pas ou a été déplacée.",
    back: "Retour à l'accueil",
  },
  "ja-JP": {
    title: "ページが見つかりません",
    description: "お探しのページは存在しないか、移動されました。",
    back: "ホームに戻る",
  },
}

export default function NotFound() {
  const router = useRouter()
  const [locale, setLocale] = useState<AppLocale>(DEFAULT_LOCALE)

  // Cookie lido em useEffect (não no render) para casar com o HTML do servidor
  // e evitar mismatch de hidratação.
  useEffect(() => {
    setLocale(readLocaleCookie())
  }, [])

  useEffect(() => {
    void router.replace("/households")
  }, [router])

  const copy = COPY[locale]

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-4 text-center">
      <div className="space-y-2">
        <h1 className="text-xl font-semibold sm:text-2xl">{copy.title}</h1>
        <p className="text-sm text-muted-foreground">{copy.description}</p>
      </div>
      <Link href="/" className="text-sm font-medium text-primary hover:underline">
        {copy.back}
      </Link>
    </div>
  )
}

// No layout — bare page (redireciona para /households assim que possível)
NotFound.getLayout = (page: ReactElement) => page
