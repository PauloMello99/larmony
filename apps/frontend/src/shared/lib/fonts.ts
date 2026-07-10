import { Sora } from "next/font/google"

/**
 * Sora — tipografia do Larmony (Design System 2026-07-10). Global: aplicada em
 * `_app.tsx` via wrapper com `sora.variable` + font-family na MESMA camada
 * (a var não sobe para o `html`). Nasceu na landing (Direção A · Aconchego) e
 * foi estendida ao app todo.
 */
export const sora = Sora({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-sora",
  display: "swap",
})
