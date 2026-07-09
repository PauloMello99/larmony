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
import type { Category } from "@/features/categories/types"
import type { TransactionFilters, TransactionType } from "../types"

const ALL = "all"

interface TransactionFiltersBarProps {
  filters: TransactionFilters
  onChange: (filters: TransactionFilters) => void
  categories: Category[]
}

export function TransactionFiltersBar({
  filters,
  onChange,
  categories,
}: TransactionFiltersBarProps) {
  const { t } = useTranslation("transactions")
  const locale = useActiveLocale()
  const now = new Date()
  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i)
  // Intl devolve o mês em minúsculas no pt-BR; capitaliza para manter o visual.
  const months = Array.from({ length: 12 }, (_, i) => {
    const name = monthName(i, locale)
    return name.charAt(0).toLocaleUpperCase(locale) + name.slice(1)
  })

  return (
    <div className="mb-4 flex flex-wrap gap-2">
      <Select
        value={String(filters.month ?? now.getMonth() + 1)}
        onValueChange={(v) => onChange({ ...filters, month: Number(v) })}
      >
        <SelectTrigger className="w-36" aria-label={t("filters.byMonth")}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {months.map((label, i) => (
            <SelectItem key={label} value={String(i + 1)}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={String(filters.year ?? now.getFullYear())}
        onValueChange={(v) => onChange({ ...filters, year: Number(v) })}
      >
        <SelectTrigger className="w-24" aria-label={t("filters.byYear")}>
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

      <Select
        value={filters.type ?? ALL}
        onValueChange={(v) =>
          onChange({ ...filters, type: v === ALL ? undefined : (v as TransactionType) })
        }
      >
        <SelectTrigger className="w-32" aria-label={t("filters.byType")}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>{t("filters.typeAll")}</SelectItem>
          <SelectItem value="income">{t("filters.typeIncome")}</SelectItem>
          <SelectItem value="expense">{t("filters.typeExpense")}</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={filters.categoryId ?? ALL}
        onValueChange={(v) =>
          onChange({ ...filters, categoryId: v === ALL ? undefined : v })
        }
      >
        <SelectTrigger className="w-40" aria-label={t("filters.byCategory")}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>{t("filters.categoryAll")}</SelectItem>
          {categories.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              {c.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
