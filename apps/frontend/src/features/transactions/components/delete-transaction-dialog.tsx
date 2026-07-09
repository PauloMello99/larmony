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
import type { Transaction } from "../types"

interface DeleteTransactionDialogProps {
  transaction: Transaction | null
  onOpenChange: (open: boolean) => void
  onConfirm: () => Promise<void>
  /** Exclui a série inteira (só quando a transação é uma parcela). */
  onConfirmSeries: () => Promise<void>
}

export function DeleteTransactionDialog({
  transaction,
  onOpenChange,
  onConfirm,
  onConfirmSeries,
}: DeleteTransactionDialogProps) {
  const { t } = useTranslation("transactions")
  const { t: tCommon } = useTranslation("common")
  const [loading, setLoading] = useState<"one" | "series" | null>(null)
  const isInstallment = !!transaction?.installmentGroupId

  async function run(kind: "one" | "series", fn: () => Promise<void>) {
    setLoading(kind)
    try {
      await fn()
      onOpenChange(false)
    } finally {
      setLoading(null)
    }
  }

  return (
    <Dialog open={!!transaction} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("deleteDialog.title")}</DialogTitle>
          <DialogDescription>
            {isInstallment ? (
              <Trans
                t={t}
                i18nKey="deleteDialog.installmentDescription"
                values={{
                  description: transaction?.description,
                  number: transaction?.installmentNumber,
                  total: transaction?.installmentCount,
                }}
                components={{ desc: <span className="font-medium text-foreground" /> }}
              />
            ) : (
              <Trans
                t={t}
                i18nKey="deleteDialog.normalDescription"
                values={{ description: transaction?.description }}
                components={{
                  desc: <span className="font-medium text-foreground" />,
                  emphasis: <span className="font-semibold text-red-400" />,
                }}
              />
            )}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          {isInstallment && (
            <Button
              variant="outline"
              disabled={loading !== null}
              onClick={() => run("series", onConfirmSeries)}
              className="w-full sm:w-auto"
            >
              {loading === "series" ? t("deleteDialog.deleting") : t("deleteDialog.deleteSeries")}
            </Button>
          )}
          <Button
            variant="destructive"
            disabled={loading !== null}
            onClick={() => run("one", onConfirm)}
            className="w-full sm:w-auto"
          >
            {loading === "one"
              ? t("deleteDialog.deleting")
              : isInstallment
                ? t("deleteDialog.deleteInstallment")
                : tCommon("actions.delete")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
