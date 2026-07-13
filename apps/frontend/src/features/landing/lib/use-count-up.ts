import * as React from "react"
import { usePrefersReducedMotion } from "@/shared/lib/use-prefers-reduced-motion"

interface CountUpOptions {
  duration?: number
  decimals?: number
  prefix?: string
  suffix?: string
}

/**
 * Conta de 0 até `target` (easing cúbico) quando entra na viewport. O valor
 * **inicial é o alvo** — SSR, crawlers e `prefers-reduced-motion` já mostram o
 * número final (nunca "0" preso). Retorna `ref` (alvo do observer) e `display`
 * já formatado em pt-BR.
 */
export function useCountUp<T extends HTMLElement = HTMLElement>(
  target: number,
  opts: CountUpOptions = {},
) {
  const { duration = 1400, decimals = 0, prefix = "", suffix = "" } = opts
  const reduced = usePrefersReducedMotion()
  const ref = React.useRef<T>(null)
  const [value, setValue] = React.useState(target)

  React.useEffect(() => {
    if (reduced) {
      setValue(target)
      return
    }
    const el = ref.current
    if (!el) return
    let raf = 0
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return
        io.disconnect()
        const t0 = performance.now()
        const tick = (t: number) => {
          const p = Math.min((t - t0) / duration, 1)
          const eased = 1 - Math.pow(1 - p, 3)
          setValue(target * eased)
          if (p < 1) raf = requestAnimationFrame(tick)
        }
        raf = requestAnimationFrame(tick)
      },
      { threshold: 0.6 },
    )
    io.observe(el)
    return () => {
      io.disconnect()
      cancelAnimationFrame(raf)
    }
  }, [target, duration, reduced])

  const display =
    prefix +
    value.toLocaleString("pt-BR", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }) +
    suffix

  return { ref, display }
}
