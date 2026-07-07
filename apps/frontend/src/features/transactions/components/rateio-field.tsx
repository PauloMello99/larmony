"use client"

import { Check } from "lucide-react"
import { CurrencyInput } from "@/shared/components/ui/currency-input"
import { cn } from "@/shared/lib/utils"
import { formatCentsToBRL } from "@/shared/lib/currency"

export type RateioMode = "equal" | "specific"

export interface RateioMember {
  userId: string
  userName: string
}

interface RateioFieldProps {
  members: RateioMember[]
  selected: string[]
  onToggle: (userId: string) => void
  mode: RateioMode
  onModeChange: (mode: RateioMode) => void
  /** Valores específicos por membro (cents). */
  shares: Record<string, number>
  onShareChange: (userId: string, cents: number) => void
  /** Valor total a distribuir (para o somatório do modo específico). */
  amountCents: number
  /** Específico é bloqueado quando a transação é parcelada (só rateio igual). */
  allowSpecific: boolean
}

export function RateioField({
  members,
  selected,
  onToggle,
  mode,
  onModeChange,
  shares,
  onShareChange,
  amountCents,
  allowSpecific,
}: RateioFieldProps) {
  const effectiveMode: RateioMode = allowSpecific ? mode : "equal"
  const specificSum = selected.reduce((s, uid) => s + (shares[uid] ?? 0), 0)
  const sumMatches = specificSum === amountCents

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-foreground/[0.08] p-3">
      {allowSpecific && (
        <div className="flex rounded-md border border-foreground/[0.08] p-0.5 text-xs">
          {(["equal", "specific"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => onModeChange(m)}
              className={cn(
                "flex-1 rounded px-2 py-1 font-medium transition-colors",
                effectiveMode === m
                  ? "bg-primary text-primary-foreground"
                  : "text-foreground/50 hover:text-foreground",
              )}
            >
              {m === "equal" ? "Dividir igual" : "Valores específicos"}
            </button>
          ))}
        </div>
      )}

      <ul className="flex flex-col gap-1">
        {members.map((m) => {
          const isSelected = selected.includes(m.userId)
          return (
            <li key={m.userId} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onToggle(m.userId)}
                className="flex min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-foreground/[0.03]"
              >
                <span
                  className={cn(
                    "flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                    isSelected
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-foreground/25",
                  )}
                >
                  {isSelected && <Check className="h-3 w-3" />}
                </span>
                <span className="truncate">{m.userName}</span>
              </button>
              {isSelected && effectiveMode === "specific" && (
                <div className="w-28 shrink-0">
                  <CurrencyInput
                    value={shares[m.userId] ?? 0}
                    onChange={(cents) => onShareChange(m.userId, cents)}
                  />
                </div>
              )}
            </li>
          )
        })}
      </ul>

      {effectiveMode === "specific" && selected.length > 0 && (
        <p className={cn("text-xs", sumMatches ? "text-foreground/40" : "text-destructive")}>
          Soma: {formatCentsToBRL(specificSum)} / {formatCentsToBRL(amountCents)}
          {!sumMatches && " — precisa bater com o total"}
        </p>
      )}
      {effectiveMode === "equal" && selected.length > 0 && (
        <p className="text-xs text-foreground/40">
          {selected.length}× de ~{formatCentsToBRL(Math.floor(amountCents / selected.length))}
        </p>
      )}
    </div>
  )
}
