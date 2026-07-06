"use client"

import { useState } from "react"
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
import type { Bill } from "../types"

function dueLabel(daysUntilDue: number): string {
  if (daysUntilDue <= 0) return "Vence hoje"
  if (daysUntilDue === 1) return "Vence amanhã"
  return `Vence em ${daysUntilDue} dias`
}

interface BillRowProps {
  bill: Bill
  onToggleActive: (bill: Bill, isActive: boolean) => void
  onEdit: (bill: Bill) => void
  onLaunch: (bill: Bill) => void
  onDelete: (bill: Bill) => void
}

export function BillRow({ bill, onToggleActive, onEdit, onLaunch, onDelete }: BillRowProps) {
  const [launching, setLaunching] = useState(false)
  const dueSoon = bill.isActive && bill.daysUntilDue <= 7

  async function handleLaunch() {
    setLaunching(true)
    try {
      await onLaunch(bill)
    } finally {
      setLaunching(false)
    }
  }

  return (
    <div className="flex items-center gap-3 rounded-lg border border-foreground/10 bg-foreground/[0.02] p-3">
      {bill.categoryColor && (
        <span
          className="h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: bill.categoryColor }}
        />
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{bill.name}</p>
        <p className={cn("text-xs", dueSoon ? "font-medium text-warning" : "text-foreground/40")}>
          {bill.isActive ? dueLabel(bill.daysUntilDue) : "Inativa"}
          {bill.categoryName ? ` · ${bill.categoryName}` : ""}
        </p>
      </div>
      <span className="shrink-0 text-sm font-semibold text-foreground">
        {formatCentsToBRL(bill.amountCents)}
      </span>
      <Switch
        checked={bill.isActive}
        onCheckedChange={(checked) => onToggleActive(bill, checked)}
        aria-label={bill.isActive ? "Desativar conta" : "Ativar conta"}
      />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" disabled={launching}>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => onEdit(bill)}>
            <Pencil className="mr-2 h-4 w-4" />
            Editar
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleLaunch}>
            <ArrowLeftRight className="mr-2 h-4 w-4" />
            Lançar como transação
          </DropdownMenuItem>
          <DropdownMenuItem
            className="text-red-400 focus:text-red-400"
            onClick={() => onDelete(bill)}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Excluir
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
