"use client"

import { useState } from "react"
import { PiggyBank, PlusCircle } from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import { Skeleton } from "@/shared/components/ui/skeleton"
import { useCurrentHousehold } from "@/features/dashboard/components/household-context"
import { useBudgets } from "../hooks/use-budgets"
import { useBudgetMutations } from "../hooks/use-budget-mutations"
import { BudgetForm } from "./budget-form"
import { BudgetList } from "./budget-list"
import { BudgetPeriodNav } from "./budget-period-nav"
import { DeleteBudgetDialog } from "./delete-budget-dialog"
import type { Budget, BudgetFilters } from "../types"
import type { CreateBudgetFormValues } from "../schemas/budget.schemas"

function currentPeriod(): BudgetFilters {
  const now = new Date()
  return { month: now.getMonth() + 1, year: now.getFullYear() }
}

export function BudgetsPage() {
  const { householdId } = useCurrentHousehold()
  const [period, setPeriod] = useState<BudgetFilters>(currentPeriod)
  const { budgets, loading } = useBudgets(householdId, period)
  const { createBudget, updateBudget, deleteBudget } = useBudgetMutations(householdId)

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Budget | null>(null)
  const [deleting, setDeleting] = useState<Budget | null>(null)

  function openCreate() {
    setEditing(null)
    setFormOpen(true)
  }

  function openEdit(budget: Budget) {
    setEditing(budget)
    setFormOpen(true)
  }

  async function handleSubmit(values: CreateBudgetFormValues) {
    if (editing) {
      await updateBudget(editing.id, values.amountCents)
    } else {
      await createBudget({
        categoryId: values.categoryId,
        month: period.month,
        year: period.year,
        amountCents: values.amountCents,
      })
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground sm:text-2xl">Orçamentos</h1>
          <p className="mt-1 text-sm text-foreground/40">
            Limites mensais de gasto por categoria
          </p>
        </div>
        <Button
          className="w-full bg-primary text-primary-foreground hover:bg-primary/90 sm:w-auto"
          size="sm"
          onClick={openCreate}
        >
          <PlusCircle className="mr-2 h-4 w-4" />
          Novo orçamento
        </Button>
      </div>

      <BudgetPeriodNav period={period} onChange={setPeriod} />

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      ) : budgets.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-foreground/10 py-16 text-center sm:py-20">
          <PiggyBank className="mb-4 h-10 w-10 text-foreground/20" />
          <p className="text-sm text-foreground/40">Nenhum orçamento neste período.</p>
          <Button
            className="mt-4 w-full bg-primary text-primary-foreground hover:bg-primary/90 sm:w-auto"
            size="sm"
            onClick={openCreate}
          >
            <PlusCircle className="mr-2 h-4 w-4" />
            Criar orçamento
          </Button>
        </div>
      ) : (
        <BudgetList budgets={budgets} onEdit={openEdit} onDelete={setDeleting} />
      )}

      <BudgetForm
        open={formOpen}
        onOpenChange={setFormOpen}
        householdId={householdId}
        budget={editing}
        budgetedCategoryIds={budgets.map((b) => b.categoryId)}
        onSubmit={handleSubmit}
      />

      <DeleteBudgetDialog
        budget={deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        onConfirm={async () => {
          if (deleting) await deleteBudget(deleting.id)
        }}
      />
    </div>
  )
}
