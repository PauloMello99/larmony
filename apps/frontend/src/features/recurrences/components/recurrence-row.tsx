"use client"

import { MoreHorizontal, Pencil, Trash2 } from "lucide-react"
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
import { frequencyLabel, formatISODate } from "../lib/frequency"
import type { Recurrence } from "../types"

interface RecurrenceRowProps {
  recurrence: Recurrence
  onToggleActive: (recurrence: Recurrence, isActive: boolean) => void
  onEdit: (recurrence: Recurrence) => void
  onDelete: (recurrence: Recurrence) => void
}

export function RecurrenceRow({
  recurrence,
  onToggleActive,
  onEdit,
  onDelete,
}: RecurrenceRowProps) {
  const cadence = frequencyLabel(recurrence.frequency, recurrence.interval)

  return (
    <div className="flex items-center gap-3 rounded-lg border border-foreground/10 bg-foreground/[0.02] p-3">
      {recurrence.categoryColor && (
        <span
          className="h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: recurrence.categoryColor }}
        />
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{recurrence.description}</p>
        <p className="truncate text-xs text-foreground/40">
          {cadence}
          {recurrence.isActive ? ` · próxima ${formatISODate(recurrence.nextRunDate)}` : " · Inativa"}
          {recurrence.categoryName ? ` · ${recurrence.categoryName}` : ""}
        </p>
      </div>
      <span
        className={cn(
          "shrink-0 text-sm font-semibold",
          recurrence.type === "income" ? "text-success" : "text-destructive",
        )}
      >
        {recurrence.type === "income" ? "+" : "-"}
        {formatCentsToBRL(recurrence.amountCents)}
      </span>
      <Switch
        checked={recurrence.isActive}
        onCheckedChange={(checked) => onToggleActive(recurrence, checked)}
        aria-label={recurrence.isActive ? "Pausar recorrência" : "Retomar recorrência"}
      />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => onEdit(recurrence)}>
            <Pencil className="mr-2 h-4 w-4" />
            Editar
          </DropdownMenuItem>
          <DropdownMenuItem
            className="text-red-400 focus:text-red-400"
            onClick={() => onDelete(recurrence)}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Excluir
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
