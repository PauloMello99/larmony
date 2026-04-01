import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useCreateTransaction, useUpdateTransaction } from '@/queries/transactions'
import { useCategories } from '@/queries/categories'
import { useMembers } from '@/queries/members'
import { toISODate } from '@/lib/date'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { DatePicker } from '@/components/molecules/DatePicker'
import type { Tables } from '@/types/database.types'

type Transaction = Tables<'transactions'> & {
  categories: { name: string; color: string } | null
}

/** Pre-fill values when launching a transaction from a fixed account / bill. */
export interface TransactionPreset {
  description?: string
  amount?: number
  type?: 'income' | 'expense'
  category_id?: string | null
  notes?: string | null
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

export function TransactionSheet({
  open,
  onClose,
  initial,
  preset,
}: {
  open: boolean
  onClose: () => void
  initial?: Transaction
  preset?: TransactionPreset
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
  } = useForm({
    resolver: zodResolver(txSchema),
    defaultValues: {
      description: initial?.description ?? preset?.description ?? '',
      amount: initial?.amount ?? preset?.amount ?? undefined,
      type: (initial?.type as 'income' | 'expense') ?? preset?.type ?? 'expense',
      category_id: initial?.category_id ?? preset?.category_id ?? undefined,
      person_id: initial?.person_id ?? undefined,
      date: initial?.date ?? toISODate(new Date()),
      notes: initial?.notes ?? preset?.notes ?? '',
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
