"use client"

import { useState } from "react"
import { useTranslation } from "react-i18next"
import { CalendarClock, PlusCircle } from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import { Skeleton } from "@/shared/components/ui/skeleton"
import { useCurrentHousehold } from "@/features/dashboard/components/household-context"
import { useScheduledEntries } from "../hooks/use-scheduled-entries"
import { useScheduledEntryMutations } from "../hooks/use-scheduled-entry-mutations"
import { ScheduledEntryForm } from "./scheduled-entry-form"
import { ScheduledEntryList } from "./scheduled-entry-list"
import { DeleteScheduledEntryDialog } from "./delete-scheduled-entry-dialog"
import type { ScheduledEntry } from "../types"
import type { ScheduledEntryFormValues } from "../schemas/scheduled-entry.schemas"

export function ScheduledTransactionsPage() {
  const { t } = useTranslation("scheduled-transactions")
  const { householdId } = useCurrentHousehold()
  const { entries, loading } = useScheduledEntries(householdId)
  const { createEntry, updateEntry, deleteEntry, launchEntry } =
    useScheduledEntryMutations(householdId)

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<ScheduledEntry | null>(null)
  const [deleting, setDeleting] = useState<ScheduledEntry | null>(null)

  function openCreate() {
    setEditing(null)
    setFormOpen(true)
  }

  function openEdit(entry: ScheduledEntry) {
    setEditing(entry)
    setFormOpen(true)
  }

  async function handleSubmit(values: ScheduledEntryFormValues) {
    if (editing) {
      await updateEntry(editing.id, values)
    } else {
      await createEntry(values)
    }
  }

  async function handleToggleActive(entry: ScheduledEntry, isActive: boolean) {
    await updateEntry(entry.id, { isActive })
  }

  async function handleLaunch(entry: ScheduledEntry) {
    await launchEntry(entry.id)
  }

  return (
    <div className="mx-auto max-w-3xl">
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
          {t("page.newEntry")}
        </Button>
      </div>

      {loading ? (
        <div className="grid gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-foreground/10 py-16 text-center sm:py-20">
          <CalendarClock className="mb-4 h-10 w-10 text-foreground/20" />
          <p className="text-sm text-foreground/40">{t("page.empty")}</p>
          <Button
            className="mt-4 w-full bg-primary text-primary-foreground hover:bg-primary/90 sm:w-auto"
            size="sm"
            onClick={openCreate}
          >
            <PlusCircle className="mr-2 h-4 w-4" />
            {t("page.createEntry")}
          </Button>
        </div>
      ) : (
        <ScheduledEntryList
          entries={entries}
          onToggleActive={handleToggleActive}
          onEdit={openEdit}
          onLaunch={handleLaunch}
          onDelete={setDeleting}
        />
      )}

      <ScheduledEntryForm
        open={formOpen}
        onOpenChange={setFormOpen}
        householdId={householdId}
        entry={editing}
        onSubmit={handleSubmit}
      />

      <DeleteScheduledEntryDialog
        entry={deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        onConfirm={async () => {
          if (deleting) await deleteEntry(deleting.id)
        }}
      />
    </div>
  )
}
