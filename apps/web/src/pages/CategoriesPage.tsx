import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Pencil, Trash2, Tag } from 'lucide-react'
import {
  useCategories,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
  type Category,
} from '@/queries/categories'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
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

const PRESET_COLORS = [
  '#ef4444',
  '#f97316',
  '#f59e0b',
  '#eab308',
  '#84cc16',
  '#22c55e',
  '#10b981',
  '#14b8a6',
  '#06b6d4',
  '#3b82f6',
  '#6366f1',
  '#8b5cf6',
  '#a855f7',
  '#ec4899',
  '#f43f5e',
  '#6b7280',
]

const categorySchema = z.object({
  name: z.string().min(1, 'Nome obrigatório').max(50),
  type: z.enum(['expense', 'income', 'both']),
  color: z.string().min(1),
})
type CategoryForm = z.infer<typeof categorySchema>

function CategoryDialog({
  open,
  onClose,
  initial,
}: {
  open: boolean
  onClose: () => void
  initial?: Category
}) {
  'use no memo'
  const createMut = useCreateCategory()
  const updateMut = useUpdateCategory()
  const isEditing = !!initial

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
    reset,
  } = useForm({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: initial?.name ?? '',
      type: (initial?.type as 'expense' | 'income' | 'both') ?? 'expense',
      color: initial?.color ?? PRESET_COLORS[5],
    },
  })

  const selectedColor = watch('color')
  const selectedType = watch('type')

  async function onSubmit(data: CategoryForm) {
    if (isEditing) {
      await updateMut.mutateAsync({ id: initial.id, ...data })
    } else {
      await createMut.mutateAsync(data)
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
          <DialogTitle>{isEditing ? 'Editar categoria' : 'Nova categoria'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Nome</Label>
            <Input placeholder="ex: Alimentação" {...register('name')} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>
          <div className="space-y-2">
            <Label>Tipo</Label>
            <Select
              value={selectedType}
              onValueChange={(v) => setValue('type', v as 'expense' | 'income' | 'both')}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="expense">Despesa</SelectItem>
                <SelectItem value="income">Receita</SelectItem>
                <SelectItem value="both">Ambos</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Cor</Label>
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setValue('color', c)}
                  className={`size-7 rounded-full transition-transform hover:scale-110 ${
                    selectedColor === c ? 'ring-2 ring-offset-2 ring-foreground scale-110' : ''
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
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

export default function CategoriesPage() {
  const { data: categories = [], isLoading } = useCategories()
  const deleteMut = useDeleteCategory()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Category | undefined>()
  const [deleting, setDeleting] = useState<Category | undefined>()

  const expense = categories.filter((c) => c.type === 'expense' || c.type === 'both')
  const income = categories.filter((c) => c.type === 'income' || c.type === 'both')

  function openCreate() {
    setEditing(undefined)
    setDialogOpen(true)
  }
  function openEdit(c: Category) {
    setEditing(c)
    setDialogOpen(true)
  }

  if (isLoading) return <LoadingSpinner />

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold">Categorias</h1>
          <p className="text-sm text-muted-foreground">Organize suas transações por categorias</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 size-4" /> Nova categoria
        </Button>
      </div>

      {categories.length === 0 ? (
        <EmptyState
          icon={Tag}
          title="Nenhuma categoria"
          description="Crie categorias para organizar suas transações."
          action={{ label: 'Nova categoria', onClick: openCreate }}
        />
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          <CategoryGroup
            title="Despesas"
            items={expense}
            onEdit={openEdit}
            onDelete={setDeleting}
          />
          <CategoryGroup title="Receitas" items={income} onEdit={openEdit} onDelete={setDeleting} />
        </div>
      )}

      {/* key forces remount → defaultValues are re-read when switching entities */}
      <CategoryDialog
        key={editing?.id ?? 'new'}
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        initial={editing}
      />

      <ConfirmDialog
        open={!!deleting}
        title="Excluir categoria"
        description={`Tem certeza que deseja excluir "${deleting?.name}"? Transações vinculadas perderão a categoria.`}
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

function CategoryGroup({
  title,
  items,
  onEdit,
  onDelete,
}: {
  title: string
  items: Category[]
  onEdit: (c: Category) => void
  onDelete: (c: Category) => void
}) {
  if (items.length === 0) return null
  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        {title} ({items.length})
      </h2>
      <div className="space-y-2">
        {items.map((cat) => (
          <div
            key={cat.id}
            className="flex items-center justify-between rounded-lg border bg-card px-4 py-3"
          >
            <div className="flex items-center gap-3">
              <span
                className="size-3 rounded-full shrink-0"
                style={{ backgroundColor: cat.color }}
              />
              <span className="text-sm font-medium">{cat.name}</span>
              {cat.is_default && (
                <Badge variant="secondary" className="text-xs">
                  padrão
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="size-8" onClick={() => onEdit(cat)}>
                <Pencil className="size-3.5" />
              </Button>
              {!cat.is_default && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 text-muted-foreground hover:text-destructive"
                  onClick={() => onDelete(cat)}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
