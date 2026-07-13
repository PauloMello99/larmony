"use client"

import { useState } from "react"
import { useTranslation, Trans } from "react-i18next"
import { Trash2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/components/ui/dialog"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { Label } from "@/shared/components/ui/label"
import type { HouseholdSummary } from "@/features/dashboard/hooks/use-households"

interface DeleteHouseholdDialogProps {
  household: HouseholdSummary
  onConfirm: () => Promise<void>
}

export function DeleteHouseholdDialog({ household, onConfirm }: DeleteHouseholdDialogProps) {
  const { t } = useTranslation("households")
  const [open, setOpen] = useState(false)
  const [confirmation, setConfirmation] = useState("")
  const [loading, setLoading] = useState(false)

  const isConfirmed = confirmation === household.name

  async function handleDelete() {
    if (!isConfirmed) return
    setLoading(true)
    try {
      await onConfirm()
      setOpen(false)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v)
        if (!v) setConfirmation("")
      }}
    >
      <DialogTrigger asChild>
        <Button variant="destructive" size="sm" className="w-full sm:w-auto">
          <Trash2 className="h-4 w-4" />
          {t("deleteDialog.trigger")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("deleteDialog.title")}</DialogTitle>
          <DialogDescription>
            <Trans
              t={t}
              i18nKey="deleteDialog.description"
              components={{ span: <span className="font-semibold text-red-400" /> }}
            />
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3">
          <Label htmlFor="delete-confirm">
            <Trans
              t={t}
              i18nKey="deleteDialog.confirmLabel"
              values={{ name: household.name }}
              components={{ span: <span className="font-mono text-foreground/80" /> }}
            />
          </Label>
          <Input
            id="delete-confirm"
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
            placeholder={household.name}
            autoComplete="off"
          />
        </div>

        <DialogFooter>
          <Button
            variant="destructive"
            disabled={!isConfirmed || loading}
            onClick={handleDelete}
            className="w-full sm:w-auto"
          >
            {loading ? t("deleteDialog.deleting") : t("deleteDialog.submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
