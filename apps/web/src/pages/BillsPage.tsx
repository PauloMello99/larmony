import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Pencil, Trash2, Wallet, Clock, Bell, PlayCircle } from 'lucide-react'
import { useBills, useCreateBill, useUpdateBill, useDeleteBill } from '@/queries/bills'
import { useCategories } from '@/queries/categories'
import { formatBRL } from '@/lib/currency'
import { getDaysUntilDue } from '@/lib/date'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent } from '@/components/ui/card'
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
import { Textarea } from '@/components/ui/textarea'
import { EmptyState } from '@/components/atoms/EmptyState'
import { LoadingSpinner } from '@/components/atoms/LoadingSpinner'
import { ConfirmDialog } from '@/components/molecules/ConfirmDialog'
import { TransactionSheet } from '@/components/organisms/TransactionSheet'
import type { Tables } from '@/types/database.types'

type Bill = Tables<'bills'> & {
  categories: { name: string; color: string } | null
}

const REMINDER_OPTIONS = [
  { label: 'Sem lembrete', value: 'none' },
  { label: '1 dia antes', value: '1' },
  { label: '3 dias antes', value: '3' },
  { label: '7 dias antes', value: '7' },
  { label: '15 dias antes', value: '15' },
] as const

const billSchema = z.object({
  name: z.string().min(1, 'Nome obrigatório').max(80),
  amount: z.coerce.number().positive('Valor deve ser positivo'),
  due_day: z.coerce.number().int().min(1).max(31),
  category_id: z.string().optional(),
  notes: z.string().optional(),
  reminder_days_before: z.coerce.number().positive().nullable().optional(),
})
type BillForm = z.infer<typeof billSchema>

function BillDialog({
  open,
  onClose,
  initial,
}: {
  open: boolean
  onClose: () => void
  initial?: Bill
}) {
  const { data: categories = [] } = useCategories()
  const createMut = useCreateBill()
  const updateMut = useUpdateBill()
  const isEditing = !!initial

  const expenseCategories = categories.filter((c) => c.type === 'expense' || c.type === 'both')

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
    reset,
  } = useForm({
    resolver: zodResolver(billSchema),
    defaultValues: {
      name: initial?.name ?? '',
      amount: initial?.amount ?? undefined,
      due_day: initial?.due_day ?? 1,
      category_id: initial?.category_id ?? undefined,
      notes: initial?.notes ?? '',
      reminder_days_before: initial?.reminder_days_before ?? null,
    },
  })

  const selectedCategoryId = watch('category_id')
  const selectedReminder = watch('reminder_days_before')

  async function onSubmit(data: BillForm) {
    const payload = {
      ...data,
      category_id: data.category_id || null,
      notes: data.notes || null,
      reminder_days_before: data.reminder_days_before ?? null,
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
          <DialogTitle>{isEditing ? 'Editar conta' : 'Nova conta a pagar'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Nome</Label>
            <Input placeholder="ex: Aluguel, Internet..." {...register('name')} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Valor (R$)</Label>
              <Input type="number" step="0.01" {...register('amount')} />
              {errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Vencimento (dia)</Label>
              <Input type="number" min={1} max={31} {...register('due_day')} />
              {errors.due_day && (
                <p className="text-xs text-destructive">{errors.due_day.message}</p>
              )}
            </div>
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
                {expenseCategories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5">
              <Bell className="size-3.5 text-muted-foreground" />
              Lembrete por e-mail
            </Label>
            <Select
              value={selectedReminder ? String(selectedReminder) : 'none'}
              onValueChange={(v) =>
                setValue('reminder_days_before', v === 'none' ? null : Number(v))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Sem lembrete" />
              </SelectTrigger>
              <SelectContent>
                {REMINDER_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Observações (opcional)</Label>
            <Textarea rows={2} {...register('notes')} />
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

export default function BillsPage() {
  const { data: bills = [], isLoading } = useBills()
  const updateMut = useUpdateBill()
  const deleteMut = useDeleteBill()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Bill | undefined>()
  const [deleting, setDeleting] = useState<Bill | undefined>()
  const [launchBill, setLaunchBill] = useState<Bill | undefined>()

  const activeBills = (bills as unknown as Bill[]).filter((b) => b.is_active)
  const inactiveBills = (bills as unknown as Bill[]).filter((b) => !b.is_active)
  const totalMonthly = activeBills.reduce((s, b) => s + b.amount, 0)

  function openCreate() {
    setEditing(undefined)
    setDialogOpen(true)
  }
  function openEdit(b: Bill) {
    setEditing(b)
    setDialogOpen(true)
  }

  async function toggleActive(bill: Bill) {
    await updateMut.mutateAsync({ id: bill.id, is_active: !bill.is_active })
  }

  if (isLoading) return <LoadingSpinner />

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold">Contas a Pagar</h1>
          <p className="text-sm text-muted-foreground">Contas fixas e recorrentes do seu lar</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 size-4" /> Nova conta
        </Button>
      </div>

      {activeBills.length > 0 && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Total mensal (contas ativas)</p>
              <p className="text-2xl font-bold">{formatBRL(totalMonthly)}</p>
            </div>
            <Wallet className="size-8 text-primary/40" />
          </CardContent>
        </Card>
      )}

      {bills.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title="Nenhuma conta"
          description="Cadastre contas fixas para acompanhar seus gastos mensais."
          action={{ label: 'Nova conta', onClick: openCreate }}
        />
      ) : (
        <div className="space-y-6">
          {activeBills.length > 0 && (
            <BillGroup
              title="Ativas"
              bills={activeBills}
              onEdit={openEdit}
              onDelete={setDeleting}
              onToggle={toggleActive}
              onLaunch={setLaunchBill}
            />
          )}
          {inactiveBills.length > 0 && (
            <BillGroup
              title="Inativas"
              bills={inactiveBills}
              onEdit={openEdit}
              onDelete={setDeleting}
              onToggle={toggleActive}
              onLaunch={setLaunchBill}
            />
          )}
        </div>
      )}

      <BillDialog
        key={editing?.id ?? 'new'}
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        initial={editing}
      />

      <TransactionSheet
        key={launchBill?.id ?? 'launch'}
        open={!!launchBill}
        onClose={() => setLaunchBill(undefined)}
        preset={
          launchBill
            ? {
                description: launchBill.name,
                amount: launchBill.amount,
                type: 'expense',
                category_id: launchBill.category_id,
                notes: launchBill.notes,
              }
            : undefined
        }
      />

      <ConfirmDialog
        open={!!deleting}
        title="Excluir conta"
        description={`Excluir "${deleting?.name}"? Esta ação não pode ser desfeita.`}
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

function BillGroup({
  title,
  bills,
  onEdit,
  onDelete,
  onToggle,
  onLaunch,
}: {
  title: string
  bills: Bill[]
  onEdit: (b: Bill) => void
  onDelete: (b: Bill) => void
  onToggle: (b: Bill) => void
  onLaunch: (b: Bill) => void
}) {
  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        {title} ({bills.length})
      </h2>
      <div className="space-y-2">
        {bills.map((bill) => {
          const daysUntil = getDaysUntilDue(bill.due_day)
          const isDueSoon = daysUntil <= 7 && bill.is_active
          return (
            <div
              key={bill.id}
              className={`flex items-center justify-between rounded-lg border bg-card px-4 py-3 ${
                isDueSoon ? 'border-amber-200 dark:border-amber-800' : ''
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                {bill.categories && (
                  <span
                    className="size-3 rounded-full shrink-0"
                    style={{ backgroundColor: bill.categories.color }}
                  />
                )}
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium truncate">{bill.name}</p>
                    {bill.reminder_days_before && (
                      <span
                        className="flex items-center gap-0.5 text-xs text-muted-foreground"
                        title={`Lembrete ${bill.reminder_days_before} dia(s) antes`}
                      >
                        <Bell className="size-3" />
                        {bill.reminder_days_before}d
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-muted-foreground">Vence dia {bill.due_day}</span>
                    {isDueSoon && (
                      <span className="flex items-center gap-1 text-xs text-amber-600">
                        <Clock className="size-3" />
                        {daysUntil === 0 ? 'hoje' : `em ${daysUntil}d`}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-3">
                <span className="text-sm font-semibold">{formatBRL(bill.amount)}</span>
                <Switch
                  checked={bill.is_active}
                  onCheckedChange={() => onToggle(bill)}
                  title={bill.is_active ? 'Desativar' : 'Ativar'}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 text-muted-foreground hover:text-primary"
                  title="Lançar transação"
                  onClick={() => onLaunch(bill)}
                >
                  <PlayCircle className="size-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="size-8" onClick={() => onEdit(bill)}>
                  <Pencil className="size-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 text-muted-foreground hover:text-destructive"
                  onClick={() => onDelete(bill)}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
