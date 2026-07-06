"use client"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select"
import type { Category } from "@/features/categories/types"
import type { TransactionFilters, TransactionType } from "../types"

const MONTH_LABEL = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
]

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
  const now = new Date()
  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i)

  return (
    <div className="mb-4 flex flex-wrap gap-2">
      <Select
        value={String(filters.month ?? now.getMonth() + 1)}
        onValueChange={(v) => onChange({ ...filters, month: Number(v) })}
      >
        <SelectTrigger className="w-36" aria-label="Filtrar por mês">
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
        value={String(filters.year ?? now.getFullYear())}
        onValueChange={(v) => onChange({ ...filters, year: Number(v) })}
      >
        <SelectTrigger className="w-24" aria-label="Filtrar por ano">
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
        <SelectTrigger className="w-32" aria-label="Filtrar por tipo">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Tipo: todos</SelectItem>
          <SelectItem value="income">Receita</SelectItem>
          <SelectItem value="expense">Despesa</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={filters.categoryId ?? ALL}
        onValueChange={(v) =>
          onChange({ ...filters, categoryId: v === ALL ? undefined : v })
        }
      >
        <SelectTrigger className="w-40" aria-label="Filtrar por categoria">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Categoria: todas</SelectItem>
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
