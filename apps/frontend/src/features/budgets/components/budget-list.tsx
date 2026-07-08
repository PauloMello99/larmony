"use client"

import { BudgetCard } from "./budget-card"
import type { Budget } from "../types"

interface BudgetListProps {
  budgets: Budget[]
  onEdit: (b: Budget) => void
  onDelete: (b: Budget) => void
}

export function BudgetList({ budgets, onEdit, onDelete }: BudgetListProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {budgets.map((b) => (
        <BudgetCard key={b.id} budget={b} onEdit={onEdit} onDelete={onDelete} />
      ))}
    </div>
  )
}
