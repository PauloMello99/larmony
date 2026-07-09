"use client"

import { useState } from "react"
import { Trans, useTranslation } from "react-i18next"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog"
import { Button } from "@/shared/components/ui/button"
import type { ScheduledEntry } from "../types"

interface DeleteScheduledEntryDialogProps {
  entry: ScheduledEntry | null
  onOpenChange: (open: boolean) => void
  onConfirm: () => Promise<void>
}

export function DeleteScheduledEntryDialog({
  entry,
  onOpenChange,
  onConfirm,
}: DeleteScheduledEntryDialogProps) {
  const { t } = useTranslation("scheduled-transactions")
  const { t: tCommon } = useTranslation("common")
  const [loading, setLoading] = useState(false)

  async function handleConfirm() {
    setLoading(true)
    try {
      await onConfirm()
      onOpenChange(false)
    } finally {
      setLoading(false)
    }
  }

  // A cópia difere por modo: transações lançadas manualmente não têm nenhum
  // vínculo com a entry (nunca são afetadas); as geradas automaticamente têm
  // FK ON DELETE SET NULL (continuam no histórico, deixam de ser marcadas).
  const descriptionKey =
    entry?.postingMode === "auto" ? "deleteDialog.descriptionAuto" : "deleteDialog.descriptionManual"

  return (
    <Dialog open={!!entry} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("deleteDialog.title")}</DialogTitle>
          <DialogDescription>
            <Trans
              t={t}
              i18nKey={descriptionKey}
              values={{ description: entry?.description ?? "" }}
              components={{ span: <span className="font-medium text-foreground" /> }}
            />
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="destructive"
            disabled={loading}
            onClick={handleConfirm}
            className="w-full sm:w-auto"
          >
            {loading ? t("deleteDialog.deleting") : tCommon("actions.delete")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
