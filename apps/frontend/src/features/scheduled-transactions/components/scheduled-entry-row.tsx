"use client"

import { useState } from "react"
import { useTranslation } from "react-i18next"
import type { TFunction } from "i18next"
import { ArrowLeftRight, MoreHorizontal, Pencil, Trash2 } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu"
import { Button } from "@/shared/components/ui/button"
import { Switch } from "@/shared/components/ui/switch"
import { cn } from "@/shared/lib/utils"
import { formatCentsToBRL } from "@/shared/lib/currency"
import { formatDate, useActiveLocale } from "@/shared/lib/format"
import { frequencyLabel } from "../lib/frequency"
import type { ScheduledEntry } from "../types"

function dueLabel(t: TFunction, daysUntilDue: number): string {
  if (daysUntilDue <= 0) return t("row.dueToday")
  if (daysUntilDue === 1) return t("row.dueTomorrow")
  return t("row.dueInDays", { count: daysUntilDue })
}

interface ScheduledEntryRowProps {
  entry: ScheduledEntry
  onToggleActive: (entry: ScheduledEntry, isActive: boolean) => void
  onEdit: (entry: ScheduledEntry) => void
  onLaunch: (entry: ScheduledEntry) => void
  onDelete: (entry: ScheduledEntry) => void
}

export function ScheduledEntryRow({
  entry,
  onToggleActive,
  onEdit,
  onLaunch,
  onDelete,
}: ScheduledEntryRowProps) {
  const { t } = useTranslation("scheduled-transactions")
  const { t: tCommon } = useTranslation("common")
  const locale = useActiveLocale()
  const [launching, setLaunching] = useState(false)
  const isManual = entry.postingMode === "manual"
  const cadence = frequencyLabel(entry.frequency, entry.interval, t)
  const dueSoon = isManual && entry.isActive && (entry.daysUntilDue ?? 999) <= 7

  async function handleLaunch() {
    setLaunching(true)
    try {
      await onLaunch(entry)
    } finally {
      setLaunching(false)
    }
  }

  const secondaryText = (() => {
    if (!entry.isActive) return t("row.inactive")
    if (isManual) return dueLabel(t, entry.daysUntilDue ?? 0)
    return t("row.next", {
      date: formatDate(entry.nextRunDate ?? entry.startDate, locale, {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }),
    })
  })()

  return (
    <div className="flex items-center gap-3 rounded-lg border border-foreground/[0.07] bg-foreground/[0.03] p-3">
      {entry.categoryColor && (
        <span
          className="h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: entry.categoryColor }}
        />
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{entry.description}</p>
        <p className={cn("truncate text-xs", dueSoon ? "font-medium text-warning" : "text-foreground/40")}>
          {cadence} · {secondaryText}
          {entry.categoryName ? ` · ${entry.categoryName}` : ""}
        </p>
      </div>
      <span
        className={cn(
          "shrink-0 text-sm font-semibold",
          entry.type === "income" ? "text-success" : "text-destructive",
        )}
      >
        {entry.type === "income" ? "+" : "−"}
        {formatCentsToBRL(entry.amountCents)}
      </span>
      <Switch
        checked={entry.isActive}
        onCheckedChange={(checked) => onToggleActive(entry, checked)}
        aria-label={entry.isActive ? t("row.deactivateAria") : t("row.activateAria")}
      />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" disabled={launching}>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => onEdit(entry)}>
            <Pencil className="mr-2 h-4 w-4" />
            {tCommon("actions.edit")}
          </DropdownMenuItem>
          {isManual && (
            <DropdownMenuItem onClick={handleLaunch}>
              <ArrowLeftRight className="mr-2 h-4 w-4" />
              {t("row.launchAsTransaction")}
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            className="text-red-400 focus:text-red-400"
            onClick={() => onDelete(entry)}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            {tCommon("actions.delete")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
