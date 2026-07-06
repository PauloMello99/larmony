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
import { CurrencyInput } from "@/shared/components/ui/currency-input"
import { DatePicker } from "@/shared/components/ui/date-picker"
import { useCategories } from "@/features/categories/hooks/use-categories"
import { useMembers } from "@/features/households/hooks/use-members"
import { transactionSchema, type TransactionFormValues } from "../schemas/transaction.schemas"
import type { Transaction, TransactionType } from "../types"

const TYPE_LABEL: Record<TransactionType, string> = { income: "Receita", expense: "Despesa" }

const DEFAULT_VALUES: TransactionFormValues = {
  type: "expense",
  amountCents: 0,
  description: "",
  date: new Date().toISOString().slice(0, 10),
  categoryId: undefined,
  personId: undefined,
  notes: undefined,
}

interface TransactionFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  householdId: string
  transaction?: Transaction | null
  onSubmit: (values: TransactionFormValues) => Promise<void>
}

export function TransactionForm({
  open,
  onOpenChange,
  householdId,
  transaction,
  onSubmit,
}: TransactionFormProps) {
  const isEditing = !!transaction
  const { categories } = useCategories(householdId)
  const { members } = useMembers(householdId)

  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionSchema),
    defaultValues: DEFAULT_VALUES,
  })

  const type = form.watch("type")
  const compatibleCategories = categories.filter((c) => c.type === "both" || c.type === type)

  useEffect(() => {
    if (open) {
      form.reset(
        transaction
          ? {
              type: transaction.type,
              amountCents: transaction.amountCents,
              description: transaction.description,
              date: transaction.date,
              categoryId: transaction.categoryId ?? undefined,
              personId: transaction.personId ?? undefined,
              notes: transaction.notes ?? undefined,
            }
          : DEFAULT_VALUES,
      )
    }
  }, [open, transaction, form])

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
              <SheetTitle>{isEditing ? "Editar transação" : "Nova transação"}</SheetTitle>
              <SheetDescription>
                Registre uma receita ou despesa do lar.
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
                        onValueChange={(v) => {
                          field.onChange(v)
                          form.setValue("categoryId", undefined)
                        }}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {(Object.keys(TYPE_LABEL) as TransactionType[]).map((v) => (
                            <SelectItem key={v} value={v}>
                              {TYPE_LABEL[v]}
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
                      <Input placeholder="Ex: Supermercado" autoComplete="off" autoFocus {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data</FormLabel>
                    <FormControl>
                      <DatePicker value={field.value} onChange={field.onChange} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
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
                  name="personId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pessoa</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Você" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {members.map((m) => (
                            <SelectItem key={m.userId} value={m.userId}>
                              {m.userName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notas</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Observações opcionais"
                        rows={3}
                        {...field}
                      />
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
                    : "Criar transação"}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  )
}
