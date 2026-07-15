import * as React from "react"
import dynamic from "next/dynamic"

// R3F/WebGL é client-only — desabilita SSR (pages router).
const HeroModelScene = dynamic(() => import("./hero-model-scene"), {
  ssr: false,
  loading: () => <SceneFallback />,
})

function SceneFallback() {
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="h-40 w-40 animate-pulse rounded-full bg-primary/10 blur-3xl" />
    </div>
  )
}

/** True em telas >= lg (1024px). Só monta o WebGL onde o modelo é exibido. */
function useIsDesktop(): boolean {
  const [isDesktop, setIsDesktop] = React.useState(false)
  React.useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)")
    setIsDesktop(mq.matches)
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches)
    mq.addEventListener("change", handler)
    return () => mq.removeEventListener("change", handler)
  }, [])
  return isDesktop
}

/**
 * Preenche o container pai (que define o tamanho). Fundo transparente. Só monta em
 * >= lg — assim o `.glb` e o contexto WebGL não são carregados no mobile/tablet.
 */
export function HeroModel() {
  const isDesktop = useIsDesktop()
  if (!isDesktop) return null
  return <HeroModelScene />
}
