"use client"

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
import type { Transaction } from "../types"

function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-")
  return `${d}/${m}/${y}`
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
          Editar
        </DropdownMenuItem>
        <DropdownMenuItem
          className="text-red-400 focus:text-red-400"
          onClick={() => onDelete(transaction)}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Excluir
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
  return (
    <>
      {/* Desktop table */}
      <div className="hidden overflow-hidden rounded-lg border border-foreground/10 sm:block">
        <Table>
          <TableHeader>
            <TableRow className="bg-foreground/[0.02] hover:bg-transparent">
              <TableHead className="px-4 text-foreground/50 normal-case tracking-normal">
                Descrição
              </TableHead>
              <TableHead className="px-4 text-foreground/50 normal-case tracking-normal">
                Categoria
              </TableHead>
              <TableHead className="px-4 text-foreground/50 normal-case tracking-normal">
                Pessoa
              </TableHead>
              <TableHead className="px-4 text-foreground/50 normal-case tracking-normal">
                Data
              </TableHead>
              <TableHead className="px-4 text-right text-foreground/50 normal-case tracking-normal">
                Valor
              </TableHead>
              <TableHead className="w-12 px-4" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.map((tx) => (
              <TableRow key={tx.id}>
                <TableCell className="px-4 font-medium">{tx.description}</TableCell>
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
                    <span className="text-sm text-foreground/30">Sem categoria</span>
                  )}
                </TableCell>
                <TableCell className="px-4 text-foreground/60">{tx.personName}</TableCell>
                <TableCell className="px-4 text-foreground/60">{formatDate(tx.date)}</TableCell>
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
            className="flex items-center gap-3 rounded-lg border border-foreground/10 bg-foreground/[0.02] p-3"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{tx.description}</p>
              <p className="truncate text-xs text-foreground/40">
                {tx.categoryName ?? "Sem categoria"} · {formatDate(tx.date)}
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
