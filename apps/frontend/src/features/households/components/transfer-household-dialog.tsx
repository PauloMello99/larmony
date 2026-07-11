"use client"

import { useMemo, useState } from "react"
import { useTranslation, Trans } from "react-i18next"
import { ArrowLeftRight } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select"
import { Button } from "@/shared/components/ui/button"
import { Label } from "@/shared/components/ui/label"
import type { Member } from "../types"

interface TransferHouseholdDialogProps {
  members: Member[]
  currentUserEmail: string
  onConfirm: (memberId: string) => Promise<void>
}

export function TransferHouseholdDialog({
  members,
  currentUserEmail,
  onConfirm,
}: TransferHouseholdDialogProps) {
  const { t } = useTranslation("households")
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<string>("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Elegíveis: membros ativos que não sejam o próprio dono atual.
  const eligible = useMemo(
    () =>
      members.filter((m) => m.enabled && m.userEmail !== currentUserEmail),
    [members, currentUserEmail],
  )

  async function handleConfirm() {
    if (!selected) return
    setLoading(true)
    setError(null)
    try {
      await onConfirm(selected)
      setOpen(false)
      setSelected("")
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t("transferDialog.error"),
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v)
        if (!v) {
          setSelected("")
          setError(null)
        }
      }}
    >
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="w-full sm:w-auto"
          disabled={eligible.length === 0}
        >
          <ArrowLeftRight className="h-4 w-4" />
          {t("transferDialog.trigger")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("transferDialog.title")}</DialogTitle>
          <DialogDescription>
            <Trans
              t={t}
              i18nKey="transferDialog.description"
              components={{ span: <span className="font-medium" /> }}
            />
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3">
          <Label htmlFor="transfer-target">{t("transferDialog.newOwnerLabel")}</Label>
          <Select value={selected} onValueChange={setSelected}>
            <SelectTrigger id="transfer-target">
              <SelectValue placeholder={t("transferDialog.selectPlaceholder")} />
            </SelectTrigger>
            <SelectContent>
              {eligible.map((m) => (
                <SelectItem key={m.memberId} value={m.memberId}>
                  {t("transferDialog.memberOption", { name: m.userName, email: m.userEmail })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {error && <p className="text-sm text-red-400">{error}</p>}
        </div>

        <DialogFooter>
          <Button
            disabled={!selected || loading}
            onClick={handleConfirm}
            className="w-full sm:w-auto"
          >
            {loading ? t("transferDialog.submitting") : t("transferDialog.submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
