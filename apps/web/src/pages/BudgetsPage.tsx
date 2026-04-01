import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Trash2,
  PieChart,
  AlertTriangle,
} from 'lucide-react'
import { format, addMonths, subMonths } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  useBudgets,
  useBudgetSpending,
  useCreateBudget,
  useUpdateBudget,
  useDeleteBudget,
} from '@/queries/budgets'
import { useCategories } from '@/queries/categories'
import { formatBRL } from '@/lib/currency'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { EmptyState } from '@/components/atoms/EmptyState'
import { LoadingSpinner } from '@/components/atoms/LoadingSpinner'
import { ConfirmDialog } from '@/components/molecules/ConfirmDialog'
import type { Tables } from '@/types/database.types'

type Budget = Tables<'budgets'> & {
  categories: { name: string; color: string } | null
}

const budgetSchema = z.object({
  category_id: z.string().min(1, 'Selecione uma categoria'),
  limit_amount: z.coerce.number().positive('Limite deve ser positivo'),
})
type BudgetForm = z.infer<typeof budgetSchema>

function BudgetDialog({
  open,
  onClose,
  month,
  year,
  initial,
  existingCategoryIds,
}: {
  open: boolean
  onClose: () => void
  month: number
  year: number
  initial?: Budget
  existingCategoryIds: string[]
}) {
  'use no memo'
  const { data: categories = [] } = useCategories()
  const createMut = useCreateBudget()
  const updateMut = useUpdateBudget()
  const isEditing = !!initial

  const availableCategories = isEditing
    ? categories.filter((c) => c.type === 'expense' || c.type === 'both')
    : categories.filter(
        (c) => (c.type === 'expense' || c.type === 'both') && !existingCategoryIds.includes(c.id)
      )

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
    reset,
  } = useForm({
    resolver: zodResolver(budgetSchema),
    defaultValues: {
      category_id: initial?.category_id ?? '',
      limit_amount: initial?.limit_amount ?? undefined,
    },
  })

  const selectedCategoryId = watch('category_id')

  async function onSubmit(data: BudgetForm) {
    if (isEditing) {
      await updateMut.mutateAsync({ id: initial.id, ...data })
    } else {
      await createMut.mutateAsync({ ...data, month, year })
    }
    reset()
    onClose()
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) {
          reset()
          onClose()
        }
      }}
    >
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar orçamento' : 'Novo orçamento'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Categoria</Label>
            <Select
              value={selectedCategoryId || undefined}
              disabled={isEditing}
              onValueChange={(v) => setValue('category_id', v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecionar categoria" />
              </SelectTrigger>
              <SelectContent>
                {availableCategories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.category_id && (
              <p className="text-xs text-destructive">{errors.category_id.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Limite mensal (R$)</Label>
            <Input type="number" step="0.01" placeholder="0,00" {...register('limit_amount')} />
            {errors.limit_amount && (
              <p className="text-xs text-destructive">{errors.limit_amount.message}</p>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                reset()
                onClose()
              }}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Salvando...' : isEditing ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default function BudgetsPage() {
  const today = new Date()
  const [currentDate, setCurrentDate] = useState(today)
  const month = currentDate.getMonth() + 1
  const year = currentDate.getFullYear()

  const { data: budgets = [], isLoading } = useBudgets(month, year)
  const { data: spending = {} } = useBudgetSpending(month, year)
  const deleteMut = useDeleteBudget()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Budget | undefined>()
  const [deleting, setDeleting] = useState<Budget | undefined>()

  const existingCategoryIds = budgets.map((b) => b.category_id)

  function openCreate() {
    setEditing(undefined)
    setDialogOpen(true)
  }
  function openEdit(b: Budget) {
    setEditing(b)
    setDialogOpen(true)
  }

  const totalLimit = budgets.reduce((s, b) => s + b.limit_amount, 0)
  const totalSpent = budgets.reduce((s, b) => s + (spending[b.category_id] ?? 0), 0)

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold">Orçamentos</h1>
          <p className="text-sm text-muted-foreground">Defina limites de gasto por categoria</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 size-4" /> Novo orçamento
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

      {/* Overall summary */}
      {budgets.length > 0 && (
        <Card>
          <CardContent className="pt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total orçado</span>
              <span className="font-medium">{formatBRL(totalLimit)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total gasto</span>
              <span
                className={`font-medium ${totalSpent > totalLimit ? 'text-red-600' : 'text-foreground'}`}
              >
                {formatBRL(totalSpent)}
              </span>
            </div>
            <Progress value={Math.min((totalSpent / totalLimit) * 100, 100)} className="h-2" />
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <LoadingSpinner />
      ) : budgets.length === 0 ? (
        <EmptyState
          icon={PieChart}
          title="Nenhum orçamento"
          description="Defina limites de gasto por categoria para este mês."
          action={{ label: 'Novo orçamento', onClick: openCreate }}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(budgets as unknown as Budget[]).map((budget) => {
            const spent = spending[budget.category_id] ?? 0
            const pct = budget.limit_amount > 0 ? (spent / budget.limit_amount) * 100 : 0
            const isOver = spent > budget.limit_amount
            return (
              <Card key={budget.id} className={isOver ? 'border-red-200 dark:border-red-800' : ''}>
                <CardHeader className="pb-2 flex flex-row items-start justify-between space-y-0">
                  <div className="flex items-center gap-2">
                    {budget.categories && (
                      <span
                        className="size-3 rounded-full"
                        style={{ backgroundColor: budget.categories.color }}
                      />
                    )}
                    <span className="text-sm font-medium">
                      {budget.categories?.name ?? 'Categoria'}
                    </span>
                    {isOver && <AlertTriangle className="size-4 text-red-500" />}
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7"
                      onClick={() => openEdit(budget)}
                    >
                      <Pencil className="size-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 text-muted-foreground hover:text-destructive"
                      onClick={() => setDeleting(budget)}
                    >
                      <Trash2 className="size-3" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Progress
                    value={Math.min(pct, 100)}
                    className={`h-2 ${isOver ? '[&>div]:bg-red-500' : ''}`}
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{formatBRL(spent)} gastos</span>
                    <span>Limite: {formatBRL(budget.limit_amount)}</span>
                  </div>
                  {isOver && (
                    <p className="text-xs text-red-600 font-medium">
                      Excedido em {formatBRL(spent - budget.limit_amount)}
                    </p>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <BudgetDialog
        key={editing?.id ?? 'new'}
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        month={month}
        year={year}
        initial={editing}
        existingCategoryIds={existingCategoryIds}
      />

      <ConfirmDialog
        open={!!deleting}
        title="Remover orçamento"
        description={`Remover orçamento de "${(deleting as Budget | undefined)?.categories?.name}"?`}
        confirmLabel="Remover"
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
