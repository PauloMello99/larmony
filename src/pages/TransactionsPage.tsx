import { useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
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
  useCreateTransaction,
  useUpdateTransaction,
  useDeleteTransaction,
} from '@/queries/transactions'
import { useCategories } from '@/queries/categories'
import { useMembers } from '@/queries/members'
import { formatBRL } from '@/lib/currency'
import { toISODate } from '@/lib/date'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { DatePicker } from '@/components/molecules/DatePicker'
import { EmptyState } from '@/components/atoms/EmptyState'
import { LoadingSpinner } from '@/components/atoms/LoadingSpinner'
import { AmountDisplay } from '@/components/atoms/AmountDisplay'
import { ConfirmDialog } from '@/components/molecules/ConfirmDialog'
import type { Tables } from '@/types/database.types'

type Transaction = Tables<'transactions'> & {
  categories: { name: string; color: string } | null
}

const txSchema = z.object({
  description: z.string().min(1, 'Descrição obrigatória').max(120),
  amount: z.coerce.number().positive('Valor deve ser positivo'),
  type: z.enum(['income', 'expense']),
  category_id: z.string().optional(),
  person_id: z.string().optional(),
  date: z.string().min(1, 'Data obrigatória'),
  notes: z.string().optional(),
})
type TxForm = z.infer<typeof txSchema>

function TransactionSheet({
  open,
  onClose,
  initial,
}: {
  open: boolean
  onClose: () => void
  initial?: Transaction
}) {
  'use no memo'
  const { data: categories = [] } = useCategories()
  const { data: members = [] } = useMembers()
  const createMut = useCreateTransaction()
  const updateMut = useUpdateTransaction()
  const isEditing = !!initial

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TxForm>({
    resolver: zodResolver(txSchema),
    defaultValues: {
      description: initial?.description ?? '',
      amount: initial?.amount ?? undefined,
      type: (initial?.type as 'income' | 'expense') ?? 'expense',
      category_id: initial?.category_id ?? undefined,
      person_id: initial?.person_id ?? undefined,
      date: initial?.date ?? toISODate(new Date()),
      notes: initial?.notes ?? '',
    },
  })

  const txType = watch('type')
  const selectedCategoryId = watch('category_id')
  const selectedPersonId = watch('person_id')

  const filteredCats = categories.filter((c) => c.type === txType || c.type === 'both')

  async function onSubmit(data: TxForm) {
    const payload = {
      ...data,
      category_id: data.category_id || null,
      person_id: data.person_id || null,
      notes: data.notes || null,
    }
    if (isEditing) {
      await updateMut.mutateAsync({ id: initial.id, ...payload })
    } else {
      await createMut.mutateAsync(payload)
    }
    reset()
    onClose()
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(v) => {
        if (v) return
        reset()
        onClose()
      }}
    >
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{isEditing ? 'Editar transação' : 'Nova transação'}</SheetTitle>
        </SheetHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
          {/* Type toggle */}
          <div className="space-y-2">
            <Label>Tipo</Label>
            <div className="flex gap-2">
              {(['expense', 'income'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setValue('type', t)}
                  className={`flex-1 rounded-md border py-2 text-sm font-medium transition-colors ${
                    txType === t
                      ? t === 'expense'
                        ? 'bg-red-500 text-white border-red-500'
                        : 'bg-green-500 text-white border-green-500'
                      : 'border-input hover:bg-accent'
                  }`}
                >
                  {t === 'expense' ? 'Despesa' : 'Receita'}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Descrição</Label>
            <Input placeholder="ex: Supermercado" {...register('description')} />
            {errors.description && (
              <p className="text-xs text-destructive">{errors.description.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Valor (R$)</Label>
            <Input type="number" step="0.01" placeholder="0,00" {...register('amount')} />
            {errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>Data</Label>
            <Controller
              control={control}
              name="date"
              render={({ field }) => (
                <DatePicker value={field.value} onChange={(v) => field.onChange(v ?? '')} />
              )}
            />
            {errors.date && <p className="text-xs text-destructive">{errors.date.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>Categoria</Label>
            <Select
              value={selectedCategoryId || 'none'}
              onValueChange={(v) => setValue('category_id', v === 'none' ? undefined : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sem categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem categoria</SelectItem>
                {filteredCats.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {members.length > 0 && (
            <div className="space-y-2">
              <Label>Quem realizou</Label>
              <Select
                value={selectedPersonId || 'none'}
                onValueChange={(v) => setValue('person_id', v === 'none' ? undefined : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Não especificado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Não especificado</SelectItem>
                  {members.map((m) => (
                    <SelectItem key={m.user_id} value={m.user_id}>
                      {m.full_name ?? 'Membro'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label>Observações (opcional)</Label>
            <Textarea rows={3} placeholder="Detalhes adicionais..." {...register('notes')} />
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => {
                reset()
                onClose()
              }}
            >
              Cancelar
            </Button>
            <Button type="submit" className="flex-1" disabled={isSubmitting}>
              {isSubmitting ? 'Salvando...' : isEditing ? 'Salvar' : 'Criar'}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
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
