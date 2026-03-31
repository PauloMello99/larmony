/**
 * LarmonyLogo — brand mark component, dark-mode-only system.
 *
 * Variants:
 *   "icon"      → square icon mark with container (default)
 *   "mark"      → bare arcs, no container (for sidebar headers, etc.)
 *   "full"      → horizontal wordmark, standard size
 *   "sidebar"   → compact wordmark for collapsed/narrow sidebar
 *   "large"     → marketing / splash size
 *   "favicon"   → 32×32, no text
 * 
 * Sizes (icon/mark variants):
 *   "sm" = 28px  |  "md" = 40px  |  "lg" = 56px  |  "xl" = 80px
 */

import { cn } from "@/lib/utils";

type Variant = "icon" | "mark" | "full" | "sidebar" | "large" | "favicon";
type Size    = "sm" | "md" | "lg" | "xl";

interface LarmonyLogoProps {
  variant?:   Variant;
  size?:      Size;
  /** true = fundo escuro (texto claro). false = fundo claro (texto escuro). Padrão: true */
  onDarkBg?:  boolean;
  className?: string;
}

/* ─── Design tokens (dark-only) ─────────────────────────────────── */
const T = {
  container: "#0F1923",   // deep night
  arcTop:    "#9FE1CB",   // harmony light  — roof / home arc
  arcBottom: "#5DCAA5",   // harmony        — growth / finance arc
  dot:       "#5DCAA5",   // equilibrium point
  text:      "#E8F5F0",   // warm near-white
} as const;

/* ─── Icon mark (the two arcs + dot) ────────────────────────────── */
// Uses two chained quadratic beziers per arc (matching icon-mark.svg, 48×48 reference):
//   M x1 cy  Q ctrlLx topY  cx topY  Q ctrlRx topY  x2 cy
// This creates a flat-top arch shape, not a smooth parabola.
function Arcs({ size, arcBottom, dot }: { size: number; arcBottom: string; dot: string }) {
  const cx     = size / 2;
  const cy     = size / 2;
  // Proportions derived from icon-mark.svg (48×48)
  const x1     = size * 0.083;   // 4/48
  const x2     = size * 0.917;   // 44/48
  const ctrlLx = size * 0.25;    // 12/48
  const ctrlRx = size * 0.75;    // 36/48
  const topY   = size * 0.208;   // 10/48
  const botY   = size * 0.792;   // 38/48
  const sw = Math.max(1.8, size * 0.055);
  const r  = Math.max(1.5, size * 0.04);

  return (
    <>
      <path
        d={`M${x1} ${cy} Q${ctrlLx} ${topY} ${cx} ${topY} Q${ctrlRx} ${topY} ${x2} ${cy}`}
        stroke={T.arcTop} strokeWidth={sw} strokeLinecap="round" fill="none"
      />
      <path
        d={`M${x1} ${cy} Q${ctrlLx} ${botY} ${cx} ${botY} Q${ctrlRx} ${botY} ${x2} ${cy}`}
        stroke={arcBottom} strokeWidth={sw} strokeLinecap="round" fill="none"
      />
      <circle cx={cx} cy={cy} r={r} fill={dot}/>
    </>
  );
}

const iconPx: Record<Size, number> = { sm: 28, md: 40, lg: 56, xl: 80 };

export function LarmonyLogo({
  variant   = "icon",
  size      = "md",
  onDarkBg  = true,
  className,
}: LarmonyLogoProps) {
  const textColor    = onDarkBg ? "#E8F5F0" : "#0F1923";
  const containerFill = onDarkBg ? "#162A22" : "#0F1923";
  const arcBottom    = onDarkBg ? "#5DCAA5" : "#1D9E75";
  const dotFill      = onDarkBg ? "#5DCAA5" : "#1D9E75";
  /* ── favicon ──────────────────────────────────────────────────── */
  if (variant === "favicon") {
    return (
      <svg
        width="32" height="32"
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        role="img"
        aria-label="Larmony"
      >
        <rect width="32" height="32" rx="9" fill={containerFill}/>
        <path d="M6 16 Q10 9 16 9 Q22 9 26 16"  stroke={T.arcTop}  strokeWidth="2.5" strokeLinecap="round"/>
        <path d="M6 16 Q10 23 16 23 Q22 23 26 16" stroke={arcBottom} strokeWidth="2.5" strokeLinecap="round"/>
        <circle cx="16" cy="16" r="2" fill={dotFill}/>
      </svg>
    );
  }

  const px = iconPx[size];
  const rx = Math.round(px * 0.28);

  /* ── icon (contained square) ──────────────────────────────────── */
  if (variant === "icon") {
    return (
      <svg
        width={px} height={px}
        viewBox={`0 0 ${px} ${px}`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={cn("shrink-0", className)}
        role="img"
        aria-label="Larmony"
      >
        <rect width={px} height={px} rx={rx} fill={containerFill}/>
        <Arcs size={px} arcBottom={arcBottom} dot={dotFill}/>
      </svg>
    );
  }

  /* ── mark (bare arcs, no container) ──────────────────────────── */
  if (variant === "mark") {
    return (
      <svg
        width={px} height={px}
        viewBox={`0 0 ${px} ${px}`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={cn("shrink-0", className)}
        role="img"
        aria-label="Larmony"
      >
        <Arcs size={px} arcBottom={arcBottom} dot={dotFill}/>
      </svg>
    );
  }

  /* ── wordmark variants ────────────────────────────────────────── */
  const wm = {
    full:    { w: 280, h: 56,  iconSz: 44, iconY: 6,  textX: 54, textY: 36, fontSize: 28, tracking: "0.5" },
    sidebar: { w: 200, h: 40,  iconSz: 36, iconY: 2,  textX: 44, textY: 25, fontSize: 19, tracking: "0.3" },
    large:   { w: 400, h: 80,  iconSz: 64, iconY: 8,  textX: 78, textY: 50, fontSize: 40, tracking: "1"   },
  }[variant as "full" | "sidebar" | "large"];

  const { w, h, iconSz, iconY, textX, textY, fontSize, tracking } = wm;
  const iconRx  = Math.round(iconSz * 0.28);
  const iCx     = iconSz / 2;
  const iCy     = iconSz / 2;
  // Two-Q proportions — derived from wordmark reference SVGs
  const iX1     = iconSz * 0.182;   // ~8/44
  const iX2     = iconSz * 0.818;   // ~36/44
  const iCtrlLx = iconSz * 0.364;   // ~16/44
  const iCtrlRx = iconSz * 0.636;   // ~28/44
  const iTopY   = iconSz * 0.273;   // ~12/44 from top
  const iBotY   = iconSz * 0.727;   // ~32/44 from top
  const iSw     = Math.max(1.8, iconSz * 0.055);
  const iR      = Math.max(1.5, iconSz * 0.04);

  return (
    <svg
      width={w} height={h}
      viewBox={`0 0 ${w} ${h}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="Larmony"
    >
      <rect x="0" y={iconY} width={iconSz} height={iconSz} rx={iconRx} fill={containerFill}/>
      <g transform={`translate(0, ${iconY})`}>
        <path
          d={`M${iX1} ${iCy} Q${iCtrlLx} ${iTopY} ${iCx} ${iTopY} Q${iCtrlRx} ${iTopY} ${iX2} ${iCy}`}
          stroke={T.arcTop} strokeWidth={iSw} strokeLinecap="round" fill="none"
        />
        <path
          d={`M${iX1} ${iCy} Q${iCtrlLx} ${iBotY} ${iCx} ${iBotY} Q${iCtrlRx} ${iBotY} ${iX2} ${iCy}`}
          stroke={arcBottom} strokeWidth={iSw} strokeLinecap="round" fill="none"
        />
        <circle cx={iCx} cy={iCy} r={iR} fill={dotFill}/>
      </g>
      <text
        x={textX} y={textY}
        fontFamily="Georgia, 'Times New Roman', serif"
        fontSize={fontSize}
        fontWeight="400"
        fill={textColor}
        letterSpacing={tracking}
      >
        larmony
      </text>
    </svg>
  );
}

export default LarmonyLogo;