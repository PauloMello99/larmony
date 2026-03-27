import { useState } from 'react'
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  Search,
  Pencil,
  Trash2,
  ArrowLeftRight,
} from 'lucide-react'
import { format, addMonths, subMonths } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useReactTable, getCoreRowModel, flexRender, type ColumnDef } from '@tanstack/react-table'
import {
  useTransactions,
  useTransactionSummary,
  useDeleteTransaction,
} from '@/queries/transactions'
import { useCategories } from '@/queries/categories'
import { useMembers } from '@/queries/members'
import { formatBRL } from '@/lib/currency'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { EmptyState } from '@/components/atoms/EmptyState'
import { LoadingSpinner } from '@/components/atoms/LoadingSpinner'
import { AmountDisplay } from '@/components/atoms/AmountDisplay'
import { ConfirmDialog } from '@/components/molecules/ConfirmDialog'
import { TransactionSheet } from '@/components/organisms/TransactionSheet'
import type { Tables } from '@/types/database.types'

type Transaction = Tables<'transactions'> & {
  categories: { name: string; color: string } | null
}

export default function TransactionsPage() {
  'use no memo'
  const today = new Date()
  const [currentDate, setCurrentDate] = useState(today)
  const month = currentDate.getMonth() + 1
  const year = currentDate.getFullYear()

  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('')
  const [search, setSearch] = useState('')
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editing, setEditing] = useState<Transaction | undefined>()
  const [deleting, setDeleting] = useState<Transaction | undefined>()

  const { data: categories = [] } = useCategories()
  const { data: members = [] } = useMembers()
  const { data: transactions = [], isLoading } = useTransactions({
    month,
    year,
    type: typeFilter,
    categoryId: categoryFilter || undefined,
    search: search || undefined,
  })
  const { data: summary } = useTransactionSummary(month, year)
  const deleteMut = useDeleteTransaction()

  function openCreate() {
    setEditing(undefined)
    setSheetOpen(true)
  }
  function openEdit(t: Transaction) {
    setEditing(t)
    setSheetOpen(true)
  }

  // Build member lookup for display
  const memberMap = Object.fromEntries(members.map((m) => [m.user_id, m.full_name ?? 'Membro']))

  // TanStack Table columns
  const columns: ColumnDef<Transaction>[] = [
    {
      accessorKey: 'date',
      header: 'Data',
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground whitespace-nowrap">
          {format(new Date(row.original.date), 'dd/MM', { locale: ptBR })}
        </span>
      ),
    },
    {
      accessorKey: 'description',
      header: 'Descrição',
      cell: ({ row }) => <span className="font-medium">{row.original.description}</span>,
    },
    {
      id: 'person',
      header: 'Pessoa',
      cell: ({ row }) => {
        const pid = row.original.person_id ?? undefined
        if (!pid || !memberMap[pid]) return <span className="text-sm text-muted-foreground">—</span>
        return <span className="text-sm">{memberMap[pid]}</span>
      },
    },
    {
      id: 'category',
      header: 'Categoria',
      cell: ({ row }) => {
        const cat = row.original.categories
        if (!cat) return <span className="text-sm text-muted-foreground">—</span>
        return (
          <div className="flex items-center gap-2">
            <span className="size-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
            <span className="text-sm">{cat.name}</span>
          </div>
        )
      },
    },
    {
      accessorKey: 'type',
      header: 'Tipo',
      cell: ({ row }) => (
        <Badge
          variant={row.original.type === 'income' ? 'default' : 'secondary'}
          className="text-xs"
        >
          {row.original.type === 'income' ? 'Receita' : 'Despesa'}
        </Badge>
      ),
    },
    {
      accessorKey: 'amount',
      header: () => <span className="text-right block">Valor</span>,
      cell: ({ row }) => (
        <div className="text-right">
          <AmountDisplay
            value={row.original.amount}
            type={row.original.type as 'income' | 'expense'}
          />
        </div>
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <div className="flex gap-1 justify-end">
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            onClick={() => openEdit(row.original)}
          >
            <Pencil className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-8 text-muted-foreground hover:text-destructive"
            onClick={() => setDeleting(row.original)}
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      ),
    },
  ]

  // Hide "person" column if there are no members or no one uses it
  const visibleColumns =
    members.length > 0 ? columns : columns.filter((c) => (c as { id?: string }).id !== 'person')

  const table = useReactTable({
    data: transactions as unknown as Transaction[],
    columns: visibleColumns,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold">Transações</h1>
          <p className="text-sm text-muted-foreground">Entradas e saídas do seu lar</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 size-4" /> Nova transação
        </Button>
      </div>

      {/* Month navigation */}
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setCurrentDate((d) => subMonths(d, 1))}
        >
          <ChevronLeft className="size-4" />
        </Button>
        <span className="min-w-36 text-center text-sm font-medium capitalize">
          {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
        </span>
        <Button
          variant="outline"
          size="icon"
          onClick={() => setCurrentDate((d) => addMonths(d, 1))}
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>

      {/* Summary */}
      {summary && (
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">Receitas</p>
              <p className="text-lg font-semibold text-green-600">+{formatBRL(summary.income)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">Despesas</p>
              <p className="text-lg font-semibold text-red-600">-{formatBRL(summary.expense)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">Saldo</p>
              <p
                className={`text-lg font-semibold ${summary.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}
              >
                {formatBRL(summary.balance)}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar transação..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as typeof typeFilter)}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            <SelectItem value="expense">Despesas</SelectItem>
            <SelectItem value="income">Receitas</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={categoryFilter || 'all'}
          onValueChange={(v) => setCategoryFilter(v === 'all' ? '' : v)}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as categorias</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table via TanStack Table */}
      {isLoading ? (
        <LoadingSpinner />
      ) : table.getRowModel().rows.length === 0 ? (
        <EmptyState
          icon={ArrowLeftRight}
          title="Nenhuma transação"
          description="Nenhuma transação encontrada para este período."
          action={{ label: 'Nova transação', onClick: openCreate }}
        />
      ) : (
        <div className="rounded-lg border overflow-x-auto">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <TransactionSheet
        key={editing?.id ?? 'new'}
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        initial={editing}
      />

      <ConfirmDialog
        open={!!deleting}
        title="Excluir transação"
        description={`Excluir "${deleting?.description}"? Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        variant="destructive"
        onConfirm={async () => {
          if (deleting) await deleteMut.mutateAsync(deleting.id)
          setDeleting(undefined)
        }}
        onCancel={() => setDeleting(undefined)}
      />
    </div>
  )
}
