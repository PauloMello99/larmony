import * as React from "react"

/**
 * Fundo decorativo do shell (Design System 2026-07-10): dot-grid + glows teal
 * e laranja bem discretos (~30% da intensidade da landing), atrás de todo o
 * conteúdo. Renderizar como primeiro filho de um root `relative` — o `-z-10`
 * pinta acima do bg do root e abaixo do conteúdo; as superfícies glass
 * (header/sidebar translúcidos) deixam o glow vazar.
 */
export function AppBackground() {
  return (
    <div
      className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
      aria-hidden="true"
    >
      {/* Dot-grid (mesmo SVG da landing, opacidade reduzida) */}
      <div
        className="absolute inset-0 opacity-[0.12]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32'%3E%3Ccircle cx='1' cy='1' r='1' fill='%23ffffff' fill-opacity='0.25'/%3E%3C/svg%3E")`,
          backgroundRepeat: "repeat",
        }}
      />
      {/* Glow teal no topo */}
      <div
        className="absolute -top-40 left-1/4 h-[480px] w-[480px] rounded-full blur-[120px]"
        style={{ background: "oklch(0.6 0.118 184.704 / 0.05)" }}
      />
      {/* Glow quente fraco no canto inferior direito */}
      <div
        className="absolute -bottom-32 -right-24 h-[400px] w-[400px] rounded-full blur-[100px]"
        style={{ background: "rgba(234,88,12,0.03)" }}
      />
    </div>
  )
}
