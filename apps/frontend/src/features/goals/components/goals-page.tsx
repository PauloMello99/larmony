"use client"

import { useState } from "react"
import { useTranslation } from "react-i18next"
import { PlusCircle, Target } from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import { Skeleton } from "@/shared/components/ui/skeleton"
import { useCurrentHousehold } from "@/features/dashboard/components/household-context"
import { useEntitlements } from "@/features/subscription"
import { useGoals } from "../hooks/use-goals"
import { useGoalMutations } from "../hooks/use-goal-mutations"
import { GoalForm } from "./goal-form"
import { GoalList } from "./goal-list"
import { ContributionDialog } from "./contribution-dialog"
import { DeleteGoalDialog } from "./delete-goal-dialog"
import type { Goal } from "../types"
import type { ContributionFormValues, GoalFormValues } from "../schemas/goal.schemas"

export function GoalsPage() {
  const { t } = useTranslation("goals")
  const { householdId } = useCurrentHousehold()
  const { goals, loading } = useGoals(householdId)
  const { createGoal, updateGoal, deleteGoal, addContribution, deleteContribution } =
    useGoalMutations(householdId)
  const { limits } = useEntitlements(householdId)
  const atGoalLimit = goals.length >= limits.maxActiveGoals

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Goal | null>(null)
  const [contributing, setContributing] = useState<Goal | null>(null)
  const [deleting, setDeleting] = useState<Goal | null>(null)

  // Mantém o dialog de aporte sincronizado com o savedCents recém-derivado.
  const contributingFresh = contributing
    ? (goals.find((g) => g.id === contributing.id) ?? contributing)
    : null

  function openCreate() {
    setEditing(null)
    setFormOpen(true)
  }

  function openEdit(goal: Goal) {
    setEditing(goal)
    setFormOpen(true)
  }

  async function handleSubmit(values: GoalFormValues) {
    if (editing) {
      await updateGoal(editing.id, values)
    } else {
      await createGoal(values)
    }
  }

  async function handleContribute(goalId: string, values: ContributionFormValues) {
    await addContribution(goalId, values)
  }

  return (
    <div className="flex flex-col">
      <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground sm:text-2xl">{t("page.title")}</h1>
          <p className="mt-1 text-sm text-foreground/40">{t("page.subtitle")}</p>
        </div>
        <Button
          className="w-full bg-primary text-primary-foreground hover:bg-primary/90 sm:w-auto"
          size="sm"
          onClick={openCreate}
        >
          <PlusCircle className="mr-2 h-4 w-4" />
          {t("page.newGoal")}
        </Button>
      </div>

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-36 w-full rounded-xl" />
          ))}
        </div>
      ) : goals.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-foreground/10 py-16 text-center sm:py-20">
          <Target className="mb-4 h-10 w-10 text-foreground/20" />
          <p className="text-sm text-foreground/40">{t("page.empty")}</p>
          <Button
            className="mt-4 w-full bg-primary text-primary-foreground hover:bg-primary/90 sm:w-auto"
            size="sm"
            onClick={openCreate}
          >
            <PlusCircle className="mr-2 h-4 w-4" />
            {t("page.createGoal")}
          </Button>
        </div>
      ) : (
        <GoalList
          goals={goals}
          onContribute={setContributing}
          onEdit={openEdit}
          onDelete={setDeleting}
        />
      )}

      <GoalForm
        open={formOpen}
        onOpenChange={setFormOpen}
        goal={editing}
        atLimit={atGoalLimit}
        onSubmit={handleSubmit}
      />

      <ContributionDialog
        householdId={householdId}
        goal={contributingFresh}
        onOpenChange={(open) => !open && setContributing(null)}
        onSubmit={handleContribute}
        onDeleteContribution={deleteContribution}
      />

      <DeleteGoalDialog
        goal={deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        onConfirm={async () => {
          if (deleting) await deleteGoal(deleting.id)
        }}
      />
    </div>
  )
}
