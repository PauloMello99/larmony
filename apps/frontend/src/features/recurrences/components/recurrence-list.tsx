"use client"

import { RecurrenceRow } from "./recurrence-row"
import type { Recurrence } from "../types"

interface RecurrenceListProps {
  recurrences: Recurrence[]
  onToggleActive: (recurrence: Recurrence, isActive: boolean) => void
  onEdit: (recurrence: Recurrence) => void
  onDelete: (recurrence: Recurrence) => void
}

export function RecurrenceList({
  recurrences,
  onToggleActive,
  onEdit,
  onDelete,
}: RecurrenceListProps) {
  const active = recurrences.filter((r) => r.isActive)
  const inactive = recurrences.filter((r) => !r.isActive)

  return (
    <div className="grid gap-6">
      <section>
        <h3 className="mb-2 text-sm font-medium uppercase tracking-wide text-foreground/50">
          Ativas ({active.length})
        </h3>
        <div className="grid gap-2">
          {active.map((recurrence) => (
            <RecurrenceRow
              key={recurrence.id}
              recurrence={recurrence}
              onToggleActive={onToggleActive}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
          {active.length === 0 && (
            <p className="rounded-lg border border-dashed border-foreground/10 py-6 text-center text-sm text-foreground/30">
              Nenhuma recorrência ativa.
            </p>
          )}
        </div>
      </section>

      {inactive.length > 0 && (
        <section>
          <h3 className="mb-2 text-sm font-medium uppercase tracking-wide text-foreground/50">
            Inativas ({inactive.length})
          </h3>
          <div className="grid gap-2 opacity-60">
            {inactive.map((recurrence) => (
              <RecurrenceRow
                key={recurrence.id}
                recurrence={recurrence}
                onToggleActive={onToggleActive}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
