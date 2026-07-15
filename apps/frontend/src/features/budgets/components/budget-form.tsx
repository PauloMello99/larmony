"use client"

import { useEffect, useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
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
import { PremiumGate } from "@/features/subscription"
import { translateApiError } from "@/shared/lib/api-error"
import { makeCreateBudgetSchema, type CreateBudgetFormValues } from "../schemas/budget.schemas"
import type { Budget } from "../types"

interface BudgetFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  householdId: string
  budget?: Budget | null
  /** Categorias já orçadas neste período — excluídas do Select ao criar. */
  budgetedCategoryIds: string[]
  /** Lar sem a capability `budgets` (Essencial/locked, M16) — bloqueia só a criação. */
  atLimit?: boolean
  onSubmit: (values: CreateBudgetFormValues) => Promise<void>
}

export function BudgetForm({
  open,
  onOpenChange,
  householdId,
  budget,
  budgetedCategoryIds,
  atLimit,
  onSubmit,
}: BudgetFormProps) {
  const { t } = useTranslation("budgets")
  const { t: tCommon } = useTranslation("common")
  const isEditing = !!budget
  const blocked = !isEditing && !!atLimit
  const { categories } = useCategories(householdId)

  // Orçamento soma só despesas → categorias income não fazem sentido.
  // Ao criar, exclui as que já têm orçamento no período.
  const selectableCategories = categories.filter(
    (c) => (c.type === "expense" || c.type === "both") && !budgetedCategoryIds.includes(c.id),
  )

  const schema = useMemo(() => makeCreateBudgetSchema(t), [t])
  const [error, setError] = useState<string | null>(null)
  const form = useForm<CreateBudgetFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { categoryId: "", amountCents: 0 },
  })

  useEffect(() => {
    if (open) {
      form.reset(
        budget
          ? { categoryId: budget.categoryId, amountCents: budget.limitCents }
          : { categoryId: "", amountCents: 0 },
      )
      setError(null)
    }
  }, [open, budget, form])

  const handleSubmit = form.handleSubmit(async (values) => {
    setError(null)
    try {
      await onSubmit(values)
      onOpenChange(false)
    } catch (err) {
      setError(translateApiError(err, tCommon))
    }
  })

  if (blocked) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="gap-0 sm:max-w-md">
          <SheetHeader>
            <SheetTitle>{t("form.createTitle")}</SheetTitle>
          </SheetHeader>
          <SheetBody className="py-6">
            <PremiumGate descriptionKey="gate.descriptionBudgets" />
          </SheetBody>
          <SheetFooter>
            <SheetClose asChild>
              <Button variant="outline" className="w-full sm:w-auto">
                {tCommon("actions.cancel")}
              </Button>
            </SheetClose>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="gap-0 sm:max-w-md">
        <Form {...form}>
          <form onSubmit={handleSubmit} className="flex h-full flex-col">
            <SheetHeader>
              <SheetTitle>{isEditing ? t("form.editTitle") : t("form.createTitle")}</SheetTitle>
              <SheetDescription>{t("form.description")}</SheetDescription>
            </SheetHeader>

            <SheetBody className="flex flex-col gap-4 py-6">
              <FormField
                control={form.control}
                name="categoryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("form.categoryLabel")}</FormLabel>
                    {isEditing ? (
                      <div className="flex h-10 items-center gap-2 rounded-md border border-foreground/[0.08] bg-foreground/[0.02] px-3 text-sm text-foreground/70">
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: budget?.categoryColor }}
                        />
                        {budget?.categoryName}
                        <span className="ml-auto text-xs text-foreground/30">
                          {t("form.categoryImmutable")}
                        </span>
                      </div>
                    ) : (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t("form.categoryPlaceholder")} />
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
                      {t("form.limitLabel")} <span className="text-red-400">*</span>
                    </FormLabel>
                    <FormControl>
                      <CurrencyInput value={field.value} onChange={field.onChange} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {error && <p className="text-sm text-red-400">{error}</p>}
            </SheetBody>

            <SheetFooter>
              <SheetClose asChild>
                <Button type="button" variant="outline" className="w-full sm:w-auto">
                  {tCommon("actions.cancel")}
                </Button>
              </SheetClose>
              <Button
                type="submit"
                disabled={form.formState.isSubmitting}
                className="w-full sm:w-auto"
              >
                {form.formState.isSubmitting
                  ? t("form.saving")
                  : isEditing
                    ? t("form.saveChanges")
                    : t("form.create")}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  )
}
