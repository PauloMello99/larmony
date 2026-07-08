"use client"

import { useState } from "react"
import { PlusCircle, Repeat } from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import { Skeleton } from "@/shared/components/ui/skeleton"
import { useCurrentHousehold } from "@/features/dashboard/components/household-context"
import { useRecurrences } from "../hooks/use-recurrences"
import { useRecurrenceMutations } from "../hooks/use-recurrence-mutations"
import { RecurrenceForm } from "./recurrence-form"
import { RecurrenceList } from "./recurrence-list"
import { DeleteRecurrenceDialog } from "./delete-recurrence-dialog"
import type { Recurrence } from "../types"
import type { RecurrenceFormValues } from "../schemas/recurrence.schemas"

export function RecurrencesPage() {
  const { householdId } = useCurrentHousehold()
  const { recurrences, loading } = useRecurrences(householdId)
  const { createRecurrence, updateRecurrence, deleteRecurrence } =
    useRecurrenceMutations(householdId)

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Recurrence | null>(null)
  const [deleting, setDeleting] = useState<Recurrence | null>(null)

  function openCreate() {
    setEditing(null)
    setFormOpen(true)
  }

  function openEdit(recurrence: Recurrence) {
    setEditing(recurrence)
    setFormOpen(true)
  }

  async function handleSubmit(values: RecurrenceFormValues) {
    if (editing) {
      await updateRecurrence(editing.id, values)
    } else {
      await createRecurrence(values)
    }
  }

  async function handleToggleActive(recurrence: Recurrence, isActive: boolean) {
    await updateRecurrence(recurrence.id, { isActive })
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground sm:text-2xl">Recorrências</h1>
          <p className="mt-1 text-sm text-foreground/40">
            Transações que se repetem — geradas automaticamente na data de cada ocorrência
          </p>
        </div>
        <Button
          className="w-full bg-primary text-primary-foreground hover:bg-primary/90 sm:w-auto"
          size="sm"
          onClick={openCreate}
        >
          <PlusCircle className="mr-2 h-4 w-4" />
          Nova recorrência
        </Button>
      </div>

      {loading ? (
        <div className="grid gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      ) : recurrences.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-foreground/10 py-16 text-center sm:py-20">
          <Repeat className="mb-4 h-10 w-10 text-foreground/20" />
          <p className="text-sm text-foreground/40">Nenhuma recorrência cadastrada.</p>
          <Button
            className="mt-4 w-full bg-primary text-primary-foreground hover:bg-primary/90 sm:w-auto"
            size="sm"
            onClick={openCreate}
          >
            <PlusCircle className="mr-2 h-4 w-4" />
            Criar recorrência
          </Button>
        </div>
      ) : (
        <RecurrenceList
          recurrences={recurrences}
          onToggleActive={handleToggleActive}
          onEdit={openEdit}
          onDelete={setDeleting}
        />
      )}

      <RecurrenceForm
        open={formOpen}
        onOpenChange={setFormOpen}
        householdId={householdId}
        recurrence={editing}
        onSubmit={handleSubmit}
      />

      <DeleteRecurrenceDialog
        recurrence={deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        onConfirm={async () => {
          if (deleting) await deleteRecurrence(deleting.id)
        }}
      />
    </div>
  )
}
