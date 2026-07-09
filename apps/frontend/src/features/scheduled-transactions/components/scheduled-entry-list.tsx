"use client"

import { useTranslation } from "react-i18next"
import { ScheduledEntryRow } from "./scheduled-entry-row"
import type { ScheduledEntry } from "../types"

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
  const active = entries.filter((e) => e.isActive)
  const inactive = entries.filter((e) => !e.isActive)

  return (
    <div className="grid gap-6">
      <section>
        <h3 className="mb-2 text-sm font-medium uppercase tracking-wide text-foreground/50">
          {t("list.activeHeading", { count: active.length })}
        </h3>
        <div className="grid gap-2">
          {active.map((entry) => (
            <ScheduledEntryRow
              key={entry.id}
              entry={entry}
              onToggleActive={onToggleActive}
              onEdit={onEdit}
              onLaunch={onLaunch}
              onDelete={onDelete}
            />
          ))}
          {active.length === 0 && (
            <p className="rounded-lg border border-dashed border-foreground/10 py-6 text-center text-sm text-foreground/30">
              {t("list.activeEmpty")}
            </p>
          )}
        </div>
      </section>

      {inactive.length > 0 && (
        <section>
          <h3 className="mb-2 text-sm font-medium uppercase tracking-wide text-foreground/50">
            {t("list.inactiveHeading", { count: inactive.length })}
          </h3>
          <div className="grid gap-2 opacity-60">
            {inactive.map((entry) => (
              <ScheduledEntryRow
                key={entry.id}
                entry={entry}
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
