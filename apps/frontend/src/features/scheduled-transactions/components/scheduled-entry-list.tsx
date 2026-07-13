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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table"
import { Button } from "@/shared/components/ui/button"
import { Switch } from "@/shared/components/ui/switch"
import { cn } from "@/shared/lib/utils"
import { formatCentsToBRL } from "@/shared/lib/currency"
import { formatDate, useActiveLocale } from "@/shared/lib/format"
import type { AppLocale } from "@/shared/lib/locale"
import { frequencyLabel } from "../lib/frequency"
import type { ScheduledEntry } from "../types"

function dueLabel(t: TFunction, daysUntilDue: number): string {
  if (daysUntilDue <= 0) return t("row.dueToday")
  if (daysUntilDue === 1) return t("row.dueTomorrow")
  return t("row.dueInDays", { count: daysUntilDue })
}

/** Texto secundário (cadência já é mostrada à parte): vencimento (manual),
 * próxima data (auto) ou "inativo". */
function secondaryText(
  t: TFunction,
  entry: ScheduledEntry,
  locale: AppLocale,
): string {
  if (!entry.isActive) return t("row.inactive")
  if (entry.postingMode === "manual") return dueLabel(t, entry.daysUntilDue ?? 0)
  return t("row.next", {
    date: formatDate(entry.nextRunDate ?? entry.startDate, locale, {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }),
  })
}

function isDueSoon(entry: ScheduledEntry): boolean {
  return entry.postingMode === "manual" && entry.isActive && (entry.daysUntilDue ?? 999) <= 7
}

function ScheduledEntryActions({
  entry,
  onEdit,
  onLaunch,
  onDelete,
}: {
  entry: ScheduledEntry
  onEdit: (entry: ScheduledEntry) => void
  onLaunch: (entry: ScheduledEntry) => void
  onDelete: (entry: ScheduledEntry) => void
}) {
  const { t } = useTranslation("scheduled-transactions")
  const { t: tCommon } = useTranslation("common")
  const [launching, setLaunching] = useState(false)
  const isManual = entry.postingMode === "manual"

  async function handleLaunch() {
    setLaunching(true)
    try {
      await onLaunch(entry)
    } finally {
      setLaunching(false)
    }
  }

  return (
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
  )
}

interface ScheduledEntryListProps {
  entries: ScheduledEntry[]
  onToggleActive: (entry: ScheduledEntry, isActive: boolean) => void
  onEdit: (entry: ScheduledEntry) => void
  onLaunch: (entry: ScheduledEntry) => void
  onDelete: (entry: ScheduledEntry) => void
}

export function ScheduledEntryList({
  entries,
  onToggleActive,
  onEdit,
  onLaunch,
  onDelete,
}: ScheduledEntryListProps) {
  const { t } = useTranslation("scheduled-transactions")
  const locale = useActiveLocale()

  return (
    <>
      {/* Desktop table */}
      <div className="hidden overflow-hidden rounded-lg border border-foreground/[0.07] sm:block">
        <Table>
          <TableHeader>
            <TableRow className="bg-foreground/[0.02] hover:bg-transparent">
              <TableHead className="px-4 text-foreground/50 normal-case tracking-normal">
                {t("list.headerDescription")}
              </TableHead>
              <TableHead className="px-4 text-foreground/50 normal-case tracking-normal">
                {t("list.headerCadence")}
              </TableHead>
              <TableHead className="px-4 text-right text-foreground/50 normal-case tracking-normal">
                {t("list.headerAmount")}
              </TableHead>
              <TableHead className="px-4 text-center text-foreground/50 normal-case tracking-normal">
                {t("list.headerActive")}
              </TableHead>
              <TableHead className="w-12 px-4" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map((entry) => {
              const dueSoon = isDueSoon(entry)
              return (
                <TableRow key={entry.id} className={cn(!entry.isActive && "opacity-60")}>
                  <TableCell className="px-4 font-medium">
                    <span className="inline-flex items-center gap-2">
                      {entry.categoryColor && (
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: entry.categoryColor }}
                        />
                      )}
                      <span>
                        {entry.description}
                        {entry.categoryName && (
                          <span className="ml-2 text-xs text-foreground/40">
                            {entry.categoryName}
                          </span>
                        )}
                      </span>
                    </span>
                  </TableCell>
                  <TableCell className="px-4 text-sm text-foreground/60">
                    {frequencyLabel(entry.frequency, entry.interval, t)}
                    <span className={cn("ml-1", dueSoon ? "font-medium text-warning" : "text-foreground/40")}>
                      · {secondaryText(t, entry, locale)}
                    </span>
                  </TableCell>
                  <TableCell
                    className={cn(
                      "px-4 text-right font-medium",
                      entry.type === "income" ? "text-success" : "text-destructive",
                    )}
                  >
                    {entry.type === "income" ? "+" : "−"}
                    {formatCentsToBRL(entry.amountCents)}
                  </TableCell>
                  <TableCell className="px-4 text-center">
                    <Switch
                      checked={entry.isActive}
                      onCheckedChange={(checked) => onToggleActive(entry, checked)}
                      aria-label={entry.isActive ? t("row.deactivateAria") : t("row.activateAria")}
                    />
                  </TableCell>
                  <TableCell className="px-4">
                    <ScheduledEntryActions
                      entry={entry}
                      onEdit={onEdit}
                      onLaunch={onLaunch}
                      onDelete={onDelete}
                    />
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      {/* Mobile cards */}
      <div className="grid gap-2 sm:hidden">
        {entries.map((entry) => {
          const dueSoon = isDueSoon(entry)
          return (
            <div
              key={entry.id}
              className={cn(
                "flex items-center gap-3 rounded-lg border border-foreground/[0.07] bg-foreground/[0.03] p-3",
                !entry.isActive && "opacity-60",
              )}
            >
              {entry.categoryColor && (
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: entry.categoryColor }}
                />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{entry.description}</p>
                <p
                  className={cn(
                    "truncate text-xs",
                    dueSoon ? "font-medium text-warning" : "text-foreground/40",
                  )}
                >
                  {frequencyLabel(entry.frequency, entry.interval, t)} · {secondaryText(t, entry, locale)}
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
              <ScheduledEntryActions
                entry={entry}
                onEdit={onEdit}
                onLaunch={onLaunch}
                onDelete={onDelete}
              />
            </div>
          )
        })}
      </div>
    </>
  )
}
