"use client"

import { formatCentsToBRL } from "@/shared/lib/currency"

interface ChartTooltipProps {
  active?: boolean
  payload?: { name?: string; value?: number; color?: string }[]
  label?: string
  /** Formata valores monetários; quando false, exibe o número bruto. */
  formatMoney?: boolean
}

export function ReportTooltip({
  active,
  payload,
  label,
  formatMoney = true,
}: ChartTooltipProps) {
  if (!active || !payload?.length) return null

  return (
    <div className="rounded-lg border border-foreground/10 bg-popover px-3 py-2 text-xs shadow-xl">
      {label && <p className="mb-1 font-medium text-foreground">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} className="flex items-center gap-1.5 text-foreground/70">
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ backgroundColor: p.color }}
          />
          {p.name}:{" "}
          <span className="tabular-nums text-foreground">
            {formatMoney && typeof p.value === "number"
              ? formatCentsToBRL(p.value)
              : p.value}
          </span>
        </p>
      ))}
    </div>
  )
}
