"use client"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select"
import type { BudgetFilters } from "../types"

const MONTH_LABEL = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
]

interface BudgetPeriodNavProps {
  period: BudgetFilters
  onChange: (period: BudgetFilters) => void
}

export function BudgetPeriodNav({ period, onChange }: BudgetPeriodNavProps) {
  const now = new Date()
  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i)

  return (
    <div className="mb-4 flex flex-wrap gap-2">
      <Select
        value={String(period.month)}
        onValueChange={(v) => onChange({ ...period, month: Number(v) })}
      >
        <SelectTrigger className="w-36" aria-label="Mês do orçamento">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {MONTH_LABEL.map((label, i) => (
            <SelectItem key={label} value={String(i + 1)}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={String(period.year)}
        onValueChange={(v) => onChange({ ...period, year: Number(v) })}
      >
        <SelectTrigger className="w-24" aria-label="Ano do orçamento">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {years.map((y) => (
            <SelectItem key={y} value={String(y)}>
              {y}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
