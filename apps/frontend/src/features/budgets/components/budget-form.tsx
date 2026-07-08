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
import { CurrencyInput } from "@/shared/components/ui/currency-input"
import { useCategories } from "@/features/categories/hooks/use-categories"
import { createBudgetSchema, type CreateBudgetFormValues } from "../schemas/budget.schemas"
import type { Budget } from "../types"

interface BudgetFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  householdId: string
  budget?: Budget | null
  /** Categorias já orçadas neste período — excluídas do Select ao criar. */
  budgetedCategoryIds: string[]
  onSubmit: (values: CreateBudgetFormValues) => Promise<void>
}

export function BudgetForm({
  open,
  onOpenChange,
  householdId,
  budget,
  budgetedCategoryIds,
  onSubmit,
}: BudgetFormProps) {
  const isEditing = !!budget
  const { categories } = useCategories(householdId)

  // Orçamento soma só despesas → categorias income não fazem sentido.
  // Ao criar, exclui as que já têm orçamento no período.
  const selectableCategories = categories.filter(
    (c) => (c.type === "expense" || c.type === "both") && !budgetedCategoryIds.includes(c.id),
  )

  const form = useForm<CreateBudgetFormValues>({
    resolver: zodResolver(createBudgetSchema),
    defaultValues: { categoryId: "", amountCents: 0 },
  })

  useEffect(() => {
    if (open) {
      form.reset(
        budget
          ? { categoryId: budget.categoryId, amountCents: budget.limitCents }
          : { categoryId: "", amountCents: 0 },
      )
    }
  }, [open, budget, form])

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
              <SheetTitle>{isEditing ? "Editar orçamento" : "Novo orçamento"}</SheetTitle>
              <SheetDescription>
                Defina um limite mensal de gasto para uma categoria.
              </SheetDescription>
            </SheetHeader>

            <SheetBody className="flex flex-col gap-4 py-6">
              <FormField
                control={form.control}
                name="categoryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categoria</FormLabel>
                    {isEditing ? (
                      <div className="flex h-10 items-center gap-2 rounded-md border border-foreground/[0.08] bg-foreground/[0.02] px-3 text-sm text-foreground/70">
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: budget?.categoryColor }}
                        />
                        {budget?.categoryName}
                        <span className="ml-auto text-xs text-foreground/30">
                          (imutável)
                        </span>
                      </div>
                    ) : (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Escolha uma categoria" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {selectableCategories.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              <span className="flex items-center gap-2">
                                <span
                                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                                  style={{ backgroundColor: c.color }}
                                />
                                {c.name}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
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
                      Limite mensal <span className="text-red-400">*</span>
                    </FormLabel>
                    <FormControl>
                      <CurrencyInput value={field.value} onChange={field.onChange} />
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
                    : "Criar orçamento"}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  )
}
