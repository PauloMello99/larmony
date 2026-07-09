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
import type { Budget } from "../types"

interface DeleteBudgetDialogProps {
  budget: Budget | null
  onOpenChange: (open: boolean) => void
  onConfirm: () => Promise<void>
}

export function DeleteBudgetDialog({ budget, onOpenChange, onConfirm }: DeleteBudgetDialogProps) {
  const { t } = useTranslation("budgets")
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

  return (
    <Dialog open={!!budget} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("deleteDialog.title")}</DialogTitle>
          <DialogDescription>
            <Trans
              t={t}
              i18nKey="deleteDialog.description"
              values={{ name: budget?.categoryName ?? "" }}
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
