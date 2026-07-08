"use client"

import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
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
import { useCategories } from "@/features/categories/hooks/use-categories"
import { billSchema, type BillFormValues } from "../schemas/bill.schemas"
import type { Bill } from "../types"

const REMINDER_OPTIONS = [
  { value: "none", label: "Sem lembrete" },
  { value: "1", label: "1 dia antes" },
  { value: "3", label: "3 dias antes" },
  { value: "7", label: "7 dias antes" },
  { value: "15", label: "15 dias antes" },
] as const

const DEFAULT_VALUES: BillFormValues = {
  name: "",
  amountCents: 0,
  dueDay: 1,
  categoryId: undefined,
  isActive: true,
  reminderDaysBefore: null,
  notes: undefined,
}

interface BillFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  householdId: string
  bill?: Bill | null
  onSubmit: (values: BillFormValues) => Promise<void>
}

export function BillForm({ open, onOpenChange, householdId, bill, onSubmit }: BillFormProps) {
  const isEditing = !!bill
  const { categories } = useCategories(householdId)
  const compatibleCategories = categories.filter((c) => c.type === "expense" || c.type === "both")

  const form = useForm<BillFormValues>({
    resolver: zodResolver(billSchema),
    defaultValues: DEFAULT_VALUES,
  })

  useEffect(() => {
    if (open) {
      form.reset(
        bill
          ? {
              name: bill.name,
              amountCents: bill.amountCents,
              dueDay: bill.dueDay,
              categoryId: bill.categoryId ?? undefined,
              isActive: bill.isActive,
              reminderDaysBefore: bill.reminderDaysBefore as BillFormValues["reminderDaysBefore"],
              notes: bill.notes ?? undefined,
            }
          : DEFAULT_VALUES,
      )
    }
  }, [open, bill, form])

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
              <SheetTitle>{isEditing ? "Editar conta" : "Nova conta"}</SheetTitle>
              <SheetDescription>
                Contas fixas do lar — lembrete opcional, lançamento manual como transação.
              </SheetDescription>
            </SheetHeader>

            <SheetBody className="flex flex-col gap-4 py-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Nome <span className="text-red-400">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Aluguel" autoComplete="off" autoFocus {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
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

                <FormField
                  control={form.control}
                  name="dueDay"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Dia do vencimento</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={1}
                          max={31}
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

              <FormField
                control={form.control}
                name="reminderDaysBefore"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Lembrete</FormLabel>
                    <Select
                      value={field.value === null ? "none" : String(field.value)}
                      onValueChange={(v) =>
                        field.onChange(v === "none" ? null : (Number(v) as 1 | 3 | 7 | 15))
                      }
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {REMINDER_OPTIONS.map((opt) => (
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
                name="isActive"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between rounded-lg border border-foreground/[0.08] px-3 py-2.5">
                      <Label htmlFor="bill-active" className="text-sm font-normal">
                        Conta ativa
                      </Label>
                      <FormControl>
                        <Switch
                          id="bill-active"
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

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
                    : "Criar conta"}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  )
}
