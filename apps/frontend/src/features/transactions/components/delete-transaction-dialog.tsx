"use client"

import { useState } from "react"
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
          <DialogTitle>Excluir transação</DialogTitle>
          <DialogDescription>
            {isInstallment ? (
              <>
                <span className="font-medium text-foreground">{transaction?.description}</span> é
                a parcela {transaction?.installmentNumber}/{transaction?.installmentCount}. Excluir
                só esta parcela ou a série inteira?
              </>
            ) : (
              <>
                Tem certeza que deseja excluir{" "}
                <span className="font-medium text-foreground">{transaction?.description}</span>?
                Esta ação é <span className="font-semibold text-red-400">irreversível</span>.
              </>
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
              {loading === "series" ? "Excluindo…" : "Excluir série inteira"}
            </Button>
          )}
          <Button
            variant="destructive"
            disabled={loading !== null}
            onClick={() => run("one", onConfirm)}
            className="w-full sm:w-auto"
          >
            {loading === "one" ? "Excluindo…" : isInstallment ? "Excluir esta parcela" : "Excluir"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
