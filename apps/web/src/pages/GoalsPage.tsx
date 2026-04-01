import { useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Pencil, Trash2, Target, PlusCircle, History, CheckCircle2 } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  useGoals,
  useGoalContributions,
  useCreateGoal,
  useUpdateGoal,
  useDeleteGoal,
  useAddContribution,
} from '@/queries/goals'
import { formatBRL } from '@/lib/currency'
import { toISODate } from '@/lib/date'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { DatePicker } from '@/components/molecules/DatePicker'
import { EmptyState } from '@/components/atoms/EmptyState'
import { LoadingSpinner } from '@/components/atoms/LoadingSpinner'
import { ConfirmDialog } from '@/components/molecules/ConfirmDialog'
import type { Tables } from '@/types/database.types'

type Goal = Tables<'goals'>

const GOAL_COLORS = [
  '#3b82f6',
  '#8b5cf6',
  '#ec4899',
  '#f97316',
  '#22c55e',
  '#14b8a6',
  '#f59e0b',
  '#ef4444',
]

const goalSchema = z.object({
  name: z.string().min(1, 'Nome obrigatório').max(80),
  description: z.string().optional(),
  target_amount: z.number().positive('Valor deve ser positivo'),
  target_date: z.string().nullable().optional(),
  color: z.string().default('#3b82f6'),
})
type GoalForm = z.infer<typeof goalSchema>

const contributionSchema = z.object({
  amount: z.number().positive('Valor deve ser positivo'),
  date: z.string().min(1, 'Data obrigatória'),
  notes: z.string().optional(),
})
type ContributionForm = z.infer<typeof contributionSchema>

function GoalDialog({
  open,
  onClose,
  initial,
}: {
  open: boolean
  onClose: () => void
  initial?: Goal
}) {
  'use no memo'
  const createMut = useCreateGoal()
  const updateMut = useUpdateGoal()
  const isEditing = !!initial

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    control,
    formState: { errors, isSubmitting },
    reset,
  } = useForm({
    resolver: zodResolver(goalSchema),
    defaultValues: {
      name: initial?.name ?? '',
      description: initial?.description ?? '',
      target_amount: initial?.target_amount ?? undefined,
      target_date: initial?.target_date ?? null,
      color: initial?.color ?? GOAL_COLORS[0],
    },
  })

  const selectedColor = watch('color')

  async function onSubmit(data: GoalForm) {
    const payload = {
      ...data,
      description: data.description || null,
      target_date: data.target_date || null,
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
          <DialogTitle>{isEditing ? 'Editar meta' : 'Nova meta de economia'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Nome</Label>
            <Input placeholder="ex: Viagem, Reserva de emergência..." {...register('name')} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>
          <div className="space-y-2">
            <Label>Descrição (opcional)</Label>
            <Textarea rows={2} {...register('description')} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Valor alvo (R$)</Label>
              <Input type="number" step="0.01" {...register('target_amount', { valueAsNumber: true })} />
              {errors.target_amount && (
                <p className="text-xs text-destructive">{errors.target_amount.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Data alvo</Label>
              <Controller
                control={control}
                name="target_date"
                render={({ field }) => (
                  <DatePicker
                    value={field.value ?? undefined}
                    onChange={field.onChange}
                    clearable
                    placeholder="Sem prazo"
                  />
                )}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Cor</Label>
            <div className="flex gap-2 flex-wrap">
              {GOAL_COLORS.map((c) => (
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

function ContributionDialog({
  open,
  onClose,
  goal,
}: {
  open: boolean
  onClose: () => void
  goal: Goal
}) {
  const addMut = useAddContribution()
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
    reset,
  } = useForm({
    resolver: zodResolver(contributionSchema),
    defaultValues: { date: toISODate(new Date()), notes: '' },
  })

  async function onSubmit(data: ContributionForm) {
    await addMut.mutateAsync({
      goal_id: goal.id,
      amount: data.amount,
      date: data.date,
      notes: data.notes || null,
    })
    reset()
    onClose()
  }

  const remaining = goal.target_amount - goal.current_amount

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
          <DialogTitle>Adicionar contribuição</DialogTitle>
        </DialogHeader>
        <div className="mb-2 rounded-md bg-muted px-3 py-2 text-sm">
          <p className="text-muted-foreground">
            Meta: <span className="font-medium text-foreground">{goal.name}</span>
          </p>
          <p className="text-muted-foreground">
            Faltam:{' '}
            <span className="font-medium text-foreground">{formatBRL(Math.max(remaining, 0))}</span>
          </p>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Valor (R$)</Label>
            <Input type="number" step="0.01" placeholder="0,00" {...register('amount', { valueAsNumber: true })} />
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
              {isSubmitting ? 'Adicionando...' : 'Adicionar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function ContributionsHistory({
  goal,
  open,
  onClose,
}: {
  goal: Goal
  open: boolean
  onClose: () => void
}) {
  const { data: contributions = [] } = useGoalContributions(goal.id)
  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose()
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Histórico — {goal.name}</DialogTitle>
        </DialogHeader>
        {contributions.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            Nenhuma contribuição ainda.
          </p>
        ) : (
          <div className="max-h-72 overflow-y-auto space-y-2">
            {contributions.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between rounded-md border px-3 py-2"
              >
                <div>
                  <p className="text-sm font-medium">{formatBRL(c.amount)}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(c.date), "dd 'de' MMM yyyy", { locale: ptBR })}
                    {c.notes && ` · ${c.notes}`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

const STATUS_LABELS: Record<
  string,
  { label: string; variant: 'default' | 'secondary' | 'outline' }
> = {
  active: { label: 'Ativa', variant: 'default' },
  completed: { label: 'Concluída', variant: 'secondary' },
  paused: { label: 'Pausada', variant: 'outline' },
}

export default function GoalsPage() {
  const { data: goals = [], isLoading } = useGoals()
  const deleteMut = useDeleteGoal()

  const [goalDialog, setGoalDialog] = useState(false)
  const [editing, setEditing] = useState<Goal | undefined>()
  const [contributing, setContributing] = useState<Goal | undefined>()
  const [history, setHistory] = useState<Goal | undefined>()
  const [deleting, setDeleting] = useState<Goal | undefined>()

  function openCreate() {
    setEditing(undefined)
    setGoalDialog(true)
  }
  function openEdit(g: Goal) {
    setEditing(g)
    setGoalDialog(true)
  }

  const totalSaved = goals.reduce((s, g) => s + g.current_amount, 0)
  const totalTarget = goals.reduce((s, g) => s + g.target_amount, 0)

  if (isLoading) return <LoadingSpinner />

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold">Metas de Economia</h1>
          <p className="text-sm text-muted-foreground">Guarde dinheiro para seus objetivos</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 size-4" /> Nova meta
        </Button>
      </div>

      {goals.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">Total guardado</p>
              <p className="text-xl font-bold text-green-600">{formatBRL(totalSaved)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">Total almejado</p>
              <p className="text-xl font-bold">{formatBRL(totalTarget)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">Metas ativas</p>
              <p className="text-xl font-bold">
                {goals.filter((g) => g.status === 'active').length}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {goals.length === 0 ? (
        <EmptyState
          icon={Target}
          title="Nenhuma meta"
          description="Crie metas de economia para alcançar seus objetivos."
          action={{ label: 'Nova meta', onClick: openCreate }}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {goals.map((goal) => {
            const pct =
              goal.target_amount > 0
                ? Math.min((goal.current_amount / goal.target_amount) * 100, 100)
                : 0
            const isComplete = goal.status === 'completed'
            const statusInfo = STATUS_LABELS[goal.status] ?? STATUS_LABELS.active
            return (
              <Card
                key={goal.id}
                className={isComplete ? 'border-green-200 dark:border-green-800' : ''}
              >
                <CardHeader className="pb-2 flex flex-row items-start justify-between space-y-0">
                  <div className="flex items-center gap-2">
                    <span className="size-3 rounded-full" style={{ backgroundColor: goal.color }} />
                    <span className="text-sm font-semibold truncate max-w-40">{goal.name}</span>
                  </div>
                  <div className="flex gap-1">
                    <Badge variant={statusInfo.variant} className="text-xs">
                      {isComplete && <CheckCircle2 className="mr-1 size-3" />}
                      {statusInfo.label}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {goal.description && (
                    <p className="text-xs text-muted-foreground">{goal.description}</p>
                  )}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{formatBRL(goal.current_amount)}</span>
                      <span>{Math.round(pct)}%</span>
                      <span>{formatBRL(goal.target_amount)}</span>
                    </div>
                    <Progress value={pct} className={isComplete ? '[&>div]:bg-green-500' : ''} />
                  </div>
                  {goal.target_date && (
                    <p className="text-xs text-muted-foreground">
                      Alvo: {format(new Date(goal.target_date), 'dd/MM/yyyy')}
                    </p>
                  )}
                  <div className="flex gap-1 pt-1">
                    {!isComplete && (
                      <Button
                        variant="default"
                        size="sm"
                        className="flex-1 h-8 text-xs"
                        onClick={() => setContributing(goal)}
                      >
                        <PlusCircle className="mr-1 size-3" /> Contribuir
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="icon"
                      className="size-8"
                      title="Histórico"
                      onClick={() => setHistory(goal)}
                    >
                      <History className="size-3.5" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="size-8"
                      onClick={() => openEdit(goal)}
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="size-8 text-muted-foreground hover:text-destructive hover:border-destructive"
                      onClick={() => setDeleting(goal)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* key forces remount → defaultValues re-read on every open */}
      <GoalDialog
        key={editing?.id ?? 'new'}
        open={goalDialog}
        onClose={() => setGoalDialog(false)}
        initial={editing}
      />

      {contributing && (
        <ContributionDialog
          key={contributing.id}
          open={!!contributing}
          onClose={() => setContributing(undefined)}
          goal={contributing}
        />
      )}

      {history && (
        <ContributionsHistory
          open={!!history}
          onClose={() => setHistory(undefined)}
          goal={history}
        />
      )}

      <ConfirmDialog
        open={!!deleting}
        title="Excluir meta"
        description={`Excluir "${deleting?.name}"? As contribuições também serão removidas.`}
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
