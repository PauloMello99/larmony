"use client"

import { BillRow } from "./bill-row"
import type { Bill } from "../types"

interface BillListProps {
  bills: Bill[]
  onToggleActive: (bill: Bill, isActive: boolean) => void
  onEdit: (bill: Bill) => void
  onLaunch: (bill: Bill) => void
  onDelete: (bill: Bill) => void
}

export function BillList({ bills, onToggleActive, onEdit, onLaunch, onDelete }: BillListProps) {
  const active = bills.filter((b) => b.isActive)
  const inactive = bills.filter((b) => !b.isActive)

  return (
    <div className="grid gap-6">
      <section>
        <h3 className="mb-2 text-sm font-medium uppercase tracking-wide text-foreground/50">
          Ativas ({active.length})
        </h3>
        <div className="grid gap-2">
          {active.map((bill) => (
            <BillRow
              key={bill.id}
              bill={bill}
              onToggleActive={onToggleActive}
              onEdit={onEdit}
              onLaunch={onLaunch}
              onDelete={onDelete}
            />
          ))}
          {active.length === 0 && (
            <p className="rounded-lg border border-dashed border-foreground/10 py-6 text-center text-sm text-foreground/30">
              Nenhuma conta ativa.
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
            {inactive.map((bill) => (
              <BillRow
                key={bill.id}
                bill={bill}
                onToggleActive={onToggleActive}
                onEdit={onEdit}
                onLaunch={onLaunch}
                onDelete={onDelete}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
