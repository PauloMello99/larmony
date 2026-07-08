"use client"

import { useState } from "react"
import { PlusCircle, ReceiptText } from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import { Skeleton } from "@/shared/components/ui/skeleton"
import { useCurrentHousehold } from "@/features/dashboard/components/household-context"
import { useBills } from "../hooks/use-bills"
import { useBillMutations } from "../hooks/use-bill-mutations"
import { BillForm } from "./bill-form"
import { BillList } from "./bill-list"
import { DeleteBillDialog } from "./delete-bill-dialog"
import type { Bill } from "../types"
import type { BillFormValues } from "../schemas/bill.schemas"

export function BillsPage() {
  const { householdId } = useCurrentHousehold()
  const { bills, loading } = useBills(householdId)
  const { createBill, updateBill, deleteBill, launchBill } = useBillMutations(householdId)

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Bill | null>(null)
  const [deleting, setDeleting] = useState<Bill | null>(null)

  function openCreate() {
    setEditing(null)
    setFormOpen(true)
  }

  function openEdit(bill: Bill) {
    setEditing(bill)
    setFormOpen(true)
  }

  async function handleSubmit(values: BillFormValues) {
    if (editing) {
      await updateBill(editing.id, values)
    } else {
      await createBill(values)
    }
  }

  async function handleToggleActive(bill: Bill, isActive: boolean) {
    await updateBill(bill.id, { isActive })
  }

  async function handleLaunch(bill: Bill) {
    await launchBill(bill.id)
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground sm:text-2xl">Contas a pagar</h1>
          <p className="mt-1 text-sm text-foreground/40">
            Contas fixas do lar, com lembrete e lançamento manual
          </p>
        </div>
        <Button
          className="w-full bg-primary text-primary-foreground hover:bg-primary/90 sm:w-auto"
          size="sm"
          onClick={openCreate}
        >
          <PlusCircle className="mr-2 h-4 w-4" />
          Nova conta
        </Button>
      </div>

      {loading ? (
        <div className="grid gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      ) : bills.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-foreground/10 py-16 text-center sm:py-20">
          <ReceiptText className="mb-4 h-10 w-10 text-foreground/20" />
          <p className="text-sm text-foreground/40">Nenhuma conta cadastrada.</p>
          <Button
            className="mt-4 w-full bg-primary text-primary-foreground hover:bg-primary/90 sm:w-auto"
            size="sm"
            onClick={openCreate}
          >
            <PlusCircle className="mr-2 h-4 w-4" />
            Criar conta
          </Button>
        </div>
      ) : (
        <BillList
          bills={bills}
          onToggleActive={handleToggleActive}
          onEdit={openEdit}
          onLaunch={handleLaunch}
          onDelete={setDeleting}
        />
      )}

      <BillForm
        open={formOpen}
        onOpenChange={setFormOpen}
        householdId={householdId}
        bill={editing}
        onSubmit={handleSubmit}
      />

      <DeleteBillDialog
        bill={deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        onConfirm={async () => {
          if (deleting) await deleteBill(deleting.id)
        }}
      />
    </div>
  )
}
