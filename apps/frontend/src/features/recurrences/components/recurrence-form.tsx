"use client"

import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { format } from "date-fns"
import {
  Sheet,
  SheetBody,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/shared/components/ui/sheet"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/shared/components/ui/form"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { Textarea } from "@/shared/components/ui/textarea"
import { Switch } from "@/shared/components/ui/switch"
import { Label } from "@/shared/components/ui/label"
import { CurrencyInput } from "@/shared/components/ui/currency-input"
import { DatePicker } from "@/shared/components/ui/date-picker"
import { useCategories } from "@/features/categories/hooks/use-categories"
import { recurrenceSchema, type RecurrenceFormValues } from "../schemas/recurrence.schemas"
import { formatISODate } from "../lib/frequency"
import type { Recurrence, RecurrenceType } from "../types"

const FREQUENCY_OPTIONS = [
  { value: "weekly", label: "Semanal" },
  { value: "monthly", label: "Mensal" },
  { value: "yearly", label: "Anual" },
] as const

const TYPE_OPTIONS = [
  { value: "expense", label: "Despesa" },
  { value: "income", label: "Receita" },
] as const

interface RecurrenceFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  householdId: string
  recurrence?: Recurrence | null
  onSubmit: (values: RecurrenceFormValues) => Promise<void>
}

export function RecurrenceForm({
  open,
  onOpenChange,
  householdId,
  recurrence,
  onSubmit,
}: RecurrenceFormProps) {
  const isEditing = !!recurrence
  const { categories } = useCategories(householdId)

  const today = new Date()
  const startMonth = new Date(today.getFullYear(), today.getMonth())
  const endMonth = new Date(today.getFullYear() + 10, 11)
  const todayISO = format(today, "yyyy-MM-dd")

  const form = useForm<RecurrenceFormValues>({
    resolver: zodResolver(recurrenceSchema),
    defaultValues: {
      type: "expense",
      amountCents: 0,
      description: "",
      frequency: "monthly",
      interval: 1,
      startDate: todayISO,
      endDate: null,
      categoryId: undefined,
      isActive: true,
      notes: undefined,
    },
  })

  const selectedType = form.watch("type")
  const compatibleCategories = categories.filter(
    (c) => c.type === selectedType || c.type === "both",
  )

  useEffect(() => {
    if (open) {
      form.reset(
        recurrence
          ? {
              type: recurrence.type,
              amountCents: recurrence.amountCents,
              description: recurrence.description,
              frequency: recurrence.frequency,
              interval: recurrence.interval,
              startDate: recurrence.startDate,
              endDate: recurrence.endDate,
              categoryId: recurrence.categoryId ?? undefined,
              isActive: recurrence.isActive,
              notes: recurrence.notes ?? undefined,
            }
          : {
              type: "expense",
              amountCents: 0,
              description: "",
              frequency: "monthly",
              interval: 1,
              startDate: todayISO,
              endDate: null,
              categoryId: undefined,
              isActive: true,
              notes: undefined,
            },
      )
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, recurrence])

  const handleSubmit = form.handleSubmit(async (values) => {
    await onSubmit(values)
    onOpenChange(false)
  })

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="gap-0 sm:max-w-md">
        <Form {...form}>
          <form onSubmit={handleSubmit} className="flex h-full flex-col">
            <SheetHeader>
              <SheetTitle>{isEditing ? "Editar recorrência" : "Nova recorrência"}</SheetTitle>
              <SheetDescription>
                Gera transações automaticamente na cadência escolhida (salário, assinatura…).
              </SheetDescription>
            </SheetHeader>

            <SheetBody className="flex flex-col gap-4 py-6">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={(v) => field.onChange(v as RecurrenceType)}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {TYPE_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="amountCents"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Valor <span className="text-red-400">*</span>
                      </FormLabel>
                      <FormControl>
                        <CurrencyInput value={field.value} onChange={field.onChange} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Descrição <span className="text-red-400">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Salário" autoComplete="off" autoFocus {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="frequency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Frequência</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {FREQUENCY_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="interval"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>A cada</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={1}
                          max={365}
                          value={field.value}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Início</FormLabel>
                    {isEditing ? (
                      <p className="rounded-md border border-foreground/[0.08] bg-foreground/[0.02] px-3 py-2 text-sm text-foreground/50">
                        {formatISODate(field.value)} (imutável)
                      </p>
                    ) : (
                      <FormControl>
                        <DatePicker
                          value={field.value}
                          onChange={field.onChange}
                          startMonth={startMonth}
                          endMonth={endMonth}
                          placeholder="Data da 1ª ocorrência"
                        />
                      </FormControl>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Término (opcional)</FormLabel>
                    <div className="flex items-center gap-2">
                      <FormControl>
                        <DatePicker
                          value={field.value ?? ""}
                          onChange={(v) => field.onChange(v || null)}
                          startMonth={startMonth}
                          endMonth={endMonth}
                          placeholder="Sem término"
                        />
                      </FormControl>
                      {field.value && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => field.onChange(null)}
                        >
                          Limpar
                        </Button>
                      )}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="categoryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categoria</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sem categoria" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {compatibleCategories.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {isEditing && (
                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between rounded-lg border border-foreground/[0.08] px-3 py-2.5">
                        <Label htmlFor="recurrence-active" className="text-sm font-normal">
                          Recorrência ativa
                        </Label>
                        <FormControl>
                          <Switch
                            id="recurrence-active"
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notas</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Observações opcionais" rows={3} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </SheetBody>

            <SheetFooter>
              <SheetClose asChild>
                <Button type="button" variant="outline" className="w-full sm:w-auto">
                  Cancelar
                </Button>
              </SheetClose>
              <Button
                type="submit"
                disabled={form.formState.isSubmitting}
                className="w-full sm:w-auto"
              >
                {form.formState.isSubmitting
                  ? "Salvando…"
                  : isEditing
                    ? "Salvar alterações"
                    : "Criar recorrência"}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  )
}
