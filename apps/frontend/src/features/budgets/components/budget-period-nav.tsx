"use client"

import { useTranslation } from "react-i18next"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select"
import { monthName, useActiveLocale } from "@/shared/lib/format"
import type { BudgetFilters } from "../types"

const MONTH_INDEXES = Array.from({ length: 12 }, (_, i) => i)

/** Intl devolve nomes de mês em minúsculas em pt-BR/es — capitaliza para exibição. */
function capitalizeFirst(label: string): string {
  return label.charAt(0).toUpperCase() + label.slice(1)
}

interface BudgetPeriodNavProps {
  period: BudgetFilters
  onChange: (period: BudgetFilters) => void
}

export function BudgetPeriodNav({ period, onChange }: BudgetPeriodNavProps) {
  const { t } = useTranslation("budgets")
  const locale = useActiveLocale()
  const now = new Date()
  // Inclui 1 ano à frente — necessário para navegar a projeções de dezembro→
  // janeiro (M10: mês futuro é uma projeção válida do limite vigente).
  const years = Array.from({ length: 6 }, (_, i) => now.getFullYear() + 1 - i)

  return (
    <div className="mb-4 flex flex-wrap gap-2">
      <Select
        value={String(period.month)}
        onValueChange={(v) => onChange({ ...period, month: Number(v) })}
      >
        <SelectTrigger className="w-36" aria-label={t("periodNav.monthAria")}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {MONTH_INDEXES.map((i) => (
            <SelectItem key={i} value={String(i + 1)}>
              {capitalizeFirst(monthName(i, locale))}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={String(period.year)}
        onValueChange={(v) => onChange({ ...period, year: Number(v) })}
      >
        <SelectTrigger className="w-24" aria-label={t("periodNav.yearAria")}>
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
