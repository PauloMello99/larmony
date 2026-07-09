"use client"

import { useTranslation } from "react-i18next"
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu"
import { Button } from "@/shared/components/ui/button"
import { cn } from "@/shared/lib/utils"
import { formatCentsToBRL } from "@/shared/lib/currency"
import type { Budget } from "../types"

interface BudgetCardProps {
  budget: Budget
  onEdit: (b: Budget) => void
  onDelete: (b: Budget) => void
}

export function BudgetCard({ budget, onEdit, onDelete }: BudgetCardProps) {
  const { t } = useTranslation("budgets")
  const { t: tCommon } = useTranslation("common")
  const pct =
    budget.limitCents > 0 ? Math.round((budget.spentCents / budget.limitCents) * 100) : 0
  const over = budget.spentCents > budget.limitCents
  const remaining = budget.limitCents - budget.spentCents

  return (
    <div className="rounded-xl border border-foreground/10 bg-foreground/[0.02] p-4">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: budget.categoryColor }}
          />
          <span className="truncate font-medium text-foreground">{budget.categoryName}</span>
          {over && (
            <span className="shrink-0 rounded-full bg-destructive/10 px-1.5 py-0.5 text-[10px] font-medium text-destructive">
              {t("card.exceeded")}
            </span>
          )}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="-mr-2 -mt-1 h-8 w-8 shrink-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(budget)}>
              <Pencil className="mr-2 h-4 w-4" />
              {tCommon("actions.edit")}
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-red-400 focus:text-red-400"
              onClick={() => onDelete(budget)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {tCommon("actions.delete")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <span className={cn("text-lg font-semibold", over ? "text-destructive" : "text-foreground")}>
          {formatCentsToBRL(budget.spentCents)}
        </span>
        <span className="text-sm text-muted-foreground">
          {t("card.of", { value: formatCentsToBRL(budget.limitCents) })}
        </span>
      </div>

      <div className="h-1.5 w-full overflow-hidden rounded-full bg-foreground/[0.06]">
        <div
          className={cn("h-full rounded-full", over ? "bg-destructive" : "bg-primary")}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>

      <p className="mt-2 text-xs text-foreground/40">
        {over
          ? t("card.overLimit", { value: formatCentsToBRL(Math.abs(remaining)) })
          : t("card.available", { value: formatCentsToBRL(remaining) })}
      </p>
    </div>
  )
}
