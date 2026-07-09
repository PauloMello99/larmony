"use client"

import { useState } from "react"
import { useTranslation } from "react-i18next"
import { ArrowLeftRight, PlusCircle } from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import { Skeleton } from "@/shared/components/ui/skeleton"
import { useCurrentHousehold } from "@/features/dashboard/components/household-context"
import { useCategories } from "@/features/categories/hooks/use-categories"
import { useTransactions } from "../hooks/use-transactions"
import { useTransactionMutations } from "../hooks/use-transaction-mutations"
import { TransactionForm } from "./transaction-form"
import { TransactionList } from "./transaction-list"
import { TransactionFiltersBar } from "./transaction-filters"
import { DeleteTransactionDialog } from "./delete-transaction-dialog"
import type { Transaction, TransactionFilters } from "../types"
import type { TransactionFormValues } from "../schemas/transaction.schemas"

function currentFilters(): TransactionFilters {
  const now = new Date()
  return { month: now.getMonth() + 1, year: now.getFullYear() }
}

export function TransactionsPage() {
  const { t } = useTranslation("transactions")
  const { householdId } = useCurrentHousehold()
  const [filters, setFilters] = useState<TransactionFilters>(currentFilters)
  const { categories } = useCategories(householdId)
  const { transactions, loading } = useTransactions(householdId, filters)
  const { createTransaction, updateTransaction, deleteTransaction, deleteSeries } =
    useTransactionMutations(householdId)

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Transaction | null>(null)
  const [deleting, setDeleting] = useState<Transaction | null>(null)

  function openCreate() {
    setEditing(null)
    setFormOpen(true)
  }

  function openEdit(transaction: Transaction) {
    setEditing(transaction)
    setFormOpen(true)
  }

  async function handleSubmit(values: TransactionFormValues) {
    if (editing) {
      await updateTransaction(editing.id, values)
    } else {
      await createTransaction(values)
    }
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground sm:text-2xl">{t("page.title")}</h1>
          <p className="mt-1 text-sm text-foreground/40">{t("page.description")}</p>
        </div>
        <Button
          data-tour="tx-new-button"
          className="w-full bg-primary text-primary-foreground hover:bg-primary/90 sm:w-auto"
          size="sm"
          onClick={openCreate}
        >
          <PlusCircle className="mr-2 h-4 w-4" />
          {t("page.newTransaction")}
        </Button>
      </div>

      <TransactionFiltersBar filters={filters} onChange={setFilters} categories={categories} />

      {loading ? (
        <div className="grid gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-lg" />
          ))}
        </div>
      ) : transactions.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-foreground/10 py-16 text-center sm:py-20">
          <ArrowLeftRight className="mb-4 h-10 w-10 text-foreground/20" />
          <p className="text-sm text-foreground/40">{t("page.empty")}</p>
          <Button
            className="mt-4 w-full bg-primary text-primary-foreground hover:bg-primary/90 sm:w-auto"
            size="sm"
            onClick={openCreate}
          >
            <PlusCircle className="mr-2 h-4 w-4" />
            {t("page.emptyCta")}
          </Button>
        </div>
      ) : (
        <TransactionList transactions={transactions} onEdit={openEdit} onDelete={setDeleting} />
      )}

      <TransactionForm
        open={formOpen}
        onOpenChange={setFormOpen}
        householdId={householdId}
        transaction={editing}
        onSubmit={handleSubmit}
      />

      <DeleteTransactionDialog
        transaction={deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        onConfirm={async () => {
          if (deleting) await deleteTransaction(deleting.id)
        }}
        onConfirmSeries={async () => {
          if (deleting?.installmentGroupId) await deleteSeries(deleting.installmentGroupId)
        }}
      />
    </div>
  )
}
