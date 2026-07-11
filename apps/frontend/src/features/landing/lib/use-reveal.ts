import * as React from "react"
import { usePrefersReducedMotion } from "@/shared/lib/use-prefers-reduced-motion"

/**
 * Revela um elemento ao entrar na viewport (IntersectionObserver). Retorna um
 * `ref` e `shown` — o consumidor aplica as classes `lp-reveal` + (`in` quando
 * `shown`), cuja transição vive no CSS global de `LandingPage`.
 *
 * Guards contra "página em branco": `prefers-reduced-motion` revela na hora, e
 * o `<noscript>` global força visível sem JS. Conteúdo acima da dobra (hero)
 * não usa este hook — renderiza visível direto (SEO/crawlers).
 */
export function useReveal<T extends HTMLElement = HTMLDivElement>() {
  const ref = React.useRef<T>(null)
  const reduced = usePrefersReducedMotion()
  const [shown, setShown] = React.useState(false)

  React.useEffect(() => {
    if (reduced) {
      setShown(true)
      return
    }
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setShown(true)
          io.disconnect()
        }
      },
      { threshold: 0.15 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [reduced])

  return { ref, shown }
}
