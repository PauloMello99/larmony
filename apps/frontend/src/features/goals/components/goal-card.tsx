"use client"

import { useTranslation } from "react-i18next"
import { HandCoins, History, MoreHorizontal, Pencil, Trash2 } from "lucide-react"
import { format, parse } from "date-fns"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu"
import { Button } from "@/shared/components/ui/button"
import { cn } from "@/shared/lib/utils"
import { formatCentsToBRL } from "@/shared/lib/currency"
import { getDateFnsLocale, useActiveLocale } from "@/shared/lib/format"
import type { Goal } from "../types"

interface GoalCardProps {
  goal: Goal
  onContribute: (g: Goal) => void
  onEdit: (g: Goal) => void
  onDelete: (g: Goal) => void
}

export function GoalCard({ goal, onContribute, onEdit, onDelete }: GoalCardProps) {
  const { t } = useTranslation("goals")
  const { t: tCommon } = useTranslation("common")
  const locale = useActiveLocale()
  const pct =
    goal.targetAmountCents > 0
      ? Math.round((goal.savedCents / goal.targetAmountCents) * 100)
      : 0
  const done = goal.savedCents >= goal.targetAmountCents
  const targetLabel = goal.targetDate
    ? format(parse(goal.targetDate, "yyyy-MM-dd", new Date()), "dd/MM/yyyy", {
        locale: getDateFnsLocale(locale),
      })
    : null

  return (
    <div className="rounded-xl border border-foreground/[0.07] bg-foreground/[0.03] p-4">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: goal.color }}
          />
          <span className="truncate font-medium text-foreground">{goal.name}</span>
          {done && (
            <span className="shrink-0 rounded-full bg-success/10 px-1.5 py-0.5 text-[10px] font-medium text-success">
              {t("card.done")}
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
            <DropdownMenuItem onClick={() => onContribute(goal)}>
              <History className="mr-2 h-4 w-4" />
              {t("card.contributions")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onEdit(goal)}>
              <Pencil className="mr-2 h-4 w-4" />
              {tCommon("actions.edit")}
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-red-400 focus:text-red-400"
              onClick={() => onDelete(goal)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {tCommon("actions.delete")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <span className={cn("text-lg font-semibold", done ? "text-success" : "text-foreground")}>
          {formatCentsToBRL(goal.savedCents)}
        </span>
        <span className="text-sm text-muted-foreground">
          {t("card.ofTarget", { value: formatCentsToBRL(goal.targetAmountCents) })}
        </span>
      </div>

      <div className="h-1.5 w-full overflow-hidden rounded-full bg-foreground/[0.06]">
        <div
          className={cn("h-full rounded-full", done ? "bg-success" : "bg-primary")}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <p className="text-xs text-foreground/40">
          {targetLabel
            ? t("card.progressWithDate", { pct, date: targetLabel })
            : t("card.progress", { pct })}
        </p>
        <Button variant="outline" size="sm" className="h-7 gap-1.5" onClick={() => onContribute(goal)}>
          <HandCoins className="h-3.5 w-3.5" />
          {t("card.contribute")}
        </Button>
      </div>
    </div>
  )
}
