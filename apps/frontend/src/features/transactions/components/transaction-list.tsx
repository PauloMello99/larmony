"use client"

import { useTranslation } from "react-i18next"
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table"
import { Button } from "@/shared/components/ui/button"
import { cn } from "@/shared/lib/utils"
import { formatCentsToBRL } from "@/shared/lib/currency"
import { formatDate, useActiveLocale } from "@/shared/lib/format"
import type { AppLocale } from "@/shared/lib/locale"
import type { Transaction } from "../types"

/** `tx.date` é date-only (yyyy-mm-dd); o sufixo T00:00:00 força parse em hora
 * local (sem ele, `new Date` parseia como UTC e a data recua 1 dia no Brasil). */
function formatTxDate(iso: string, locale: AppLocale): string {
  return formatDate(`${iso}T00:00:00`, locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

function TxBadges({ tx }: { tx: Transaction }) {
  const { t } = useTranslation("transactions")
  if (!tx.installmentCount && tx.memberCount === 0 && !tx.scheduledTransactionEntryId) return null
  return (
    <span className="ml-2 inline-flex gap-1 align-middle">
      {tx.installmentCount && (
        <span className="rounded-full bg-foreground/[0.06] px-1.5 py-0.5 text-[10px] font-medium text-foreground/60">
          {t("list.installmentBadge", {
            number: tx.installmentNumber,
            total: tx.installmentCount,
          })}
        </span>
      )}
      {tx.memberCount > 0 && (
        <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
          {t("list.badgeSplit")}
        </span>
      )}
      {tx.scheduledTransactionEntryId && (
        <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
          {t("list.badgeRecurring")}
        </span>
      )}
    </span>
  )
}

function TransactionActions({
  transaction,
  onEdit,
  onDelete,
}: {
  transaction: Transaction
  onEdit: (t: Transaction) => void
  onDelete: (t: Transaction) => void
}) {
  const { t: tCommon } = useTranslation("common")
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => onEdit(transaction)}>
          <Pencil className="mr-2 h-4 w-4" />
          {tCommon("actions.edit")}
        </DropdownMenuItem>
        <DropdownMenuItem
          className="text-red-400 focus:text-red-400"
          onClick={() => onDelete(transaction)}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          {tCommon("actions.delete")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

interface TransactionListProps {
  transactions: Transaction[]
  onEdit: (t: Transaction) => void
  onDelete: (t: Transaction) => void
}

export function TransactionList({ transactions, onEdit, onDelete }: TransactionListProps) {
  const { t } = useTranslation("transactions")
  const locale = useActiveLocale()
  return (
    <>
      {/* Desktop table */}
      <div className="hidden overflow-hidden rounded-lg border border-foreground/[0.07] sm:block">
        <Table>
          <TableHeader>
            <TableRow className="bg-foreground/[0.02] hover:bg-transparent">
              <TableHead className="px-4 text-foreground/50 normal-case tracking-normal">
                {t("list.headerDescription")}
              </TableHead>
              <TableHead className="px-4 text-foreground/50 normal-case tracking-normal">
                {t("list.headerCategory")}
              </TableHead>
              <TableHead className="px-4 text-foreground/50 normal-case tracking-normal">
                {t("list.headerPerson")}
              </TableHead>
              <TableHead className="px-4 text-foreground/50 normal-case tracking-normal">
                {t("list.headerDate")}
              </TableHead>
              <TableHead className="px-4 text-right text-foreground/50 normal-case tracking-normal">
                {t("list.headerAmount")}
              </TableHead>
              <TableHead className="w-12 px-4" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.map((tx) => (
              <TableRow key={tx.id}>
                <TableCell className="px-4 font-medium">
                  {tx.description}
                  <TxBadges tx={tx} />
                </TableCell>
                <TableCell className="px-4">
                  {tx.categoryName ? (
                    <span className="inline-flex items-center gap-1.5 text-sm text-foreground/60">
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ backgroundColor: tx.categoryColor ?? "#8b8b8b" }}
                      />
                      {tx.categoryName}
                    </span>
                  ) : (
                    <span className="text-sm text-foreground/30">{t("list.noCategory")}</span>
                  )}
                </TableCell>
                <TableCell className="px-4 text-foreground/60">{tx.personName}</TableCell>
                <TableCell className="px-4 text-foreground/60">
                  {formatTxDate(tx.date, locale)}
                </TableCell>
                <TableCell
                  className={cn(
                    "px-4 text-right font-medium",
                    tx.type === "income" ? "text-success" : "text-destructive",
                  )}
                >
                  {tx.type === "income" ? "+" : "-"}
                  {formatCentsToBRL(tx.amountCents)}
                </TableCell>
                <TableCell className="px-4">
                  <TransactionActions transaction={tx} onEdit={onEdit} onDelete={onDelete} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile cards */}
      <div className="grid gap-2 sm:hidden">
        {transactions.map((tx) => (
          <div
            key={tx.id}
            className="flex items-center gap-3 rounded-lg border border-foreground/[0.07] bg-foreground/[0.03] p-3"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {tx.description}
                <TxBadges tx={tx} />
              </p>
              <p className="truncate text-xs text-foreground/40">
                {tx.categoryName ?? t("list.noCategory")} · {formatTxDate(tx.date, locale)}
              </p>
            </div>
            <span
              className={cn(
                "shrink-0 text-sm font-semibold",
                tx.type === "income" ? "text-success" : "text-destructive",
              )}
            >
              {tx.type === "income" ? "+" : "-"}
              {formatCentsToBRL(tx.amountCents)}
            </span>
            <TransactionActions transaction={tx} onEdit={onEdit} onDelete={onDelete} />
          </div>
        ))}
      </div>
    </>
  )
}
