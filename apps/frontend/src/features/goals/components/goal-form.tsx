"use client"

import { useEffect, useMemo } from "react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { zodResolver } from "@hookform/resolvers/zod"
import { X } from "lucide-react"
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
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { Textarea } from "@/shared/components/ui/textarea"
import { CurrencyInput } from "@/shared/components/ui/currency-input"
import { DatePicker } from "@/shared/components/ui/date-picker"
import { makeGoalSchema, type GoalFormValues } from "../schemas/goal.schemas"
import type { Goal } from "../types"

const DEFAULT_VALUES: GoalFormValues = {
  name: "",
  targetAmountCents: 0,
  description: undefined,
  targetDate: "",
  color: "#0d9488",
}

/** Limite do calendário da data alvo — metas olham para frente. */
const TARGET_END_MONTH = new Date(new Date().getFullYear() + 30, 11)

interface GoalFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  goal?: Goal | null
  onSubmit: (values: GoalFormValues) => Promise<void>
}

export function GoalForm({ open, onOpenChange, goal, onSubmit }: GoalFormProps) {
  const { t } = useTranslation("goals")
  const { t: tCommon } = useTranslation("common")
  const isEditing = !!goal

  const goalSchema = useMemo(() => makeGoalSchema(t), [t])

  const form = useForm<GoalFormValues>({
    resolver: zodResolver(goalSchema),
    defaultValues: DEFAULT_VALUES,
  })

  useEffect(() => {
    if (open) {
      form.reset(
        goal
          ? {
              name: goal.name,
              targetAmountCents: goal.targetAmountCents,
              description: goal.description ?? undefined,
              targetDate: goal.targetDate ?? "",
              color: goal.color,
            }
          : DEFAULT_VALUES,
      )
    }
  }, [open, goal, form])

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
              <SheetTitle>{isEditing ? t("form.editTitle") : t("form.createTitle")}</SheetTitle>
              <SheetDescription>{t("form.description")}</SheetDescription>
            </SheetHeader>

            <SheetBody className="flex flex-col gap-4 py-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t("form.nameLabel")} <span className="text-red-400">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t("form.namePlaceholder")}
                        autoComplete="off"
                        autoFocus
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="targetAmountCents"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {t("form.targetAmountLabel")} <span className="text-red-400">*</span>
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
                  name="color"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("form.colorLabel")}</FormLabel>
                      <FormControl>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={field.value}
                            onChange={field.onChange}
                            className="h-10 w-10 shrink-0 cursor-pointer rounded-md border border-foreground/[0.08] bg-transparent p-1"
                          />
                          <Input
                            value={field.value}
                            onChange={field.onChange}
                            className="font-mono text-xs"
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="targetDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("form.targetDateLabel")}</FormLabel>
                    <FormControl>
                      <div className="flex items-center gap-2">
                        <DatePicker
                          value={field.value}
                          onChange={field.onChange}
                          placeholder={t("form.noTargetDate")}
                          startMonth={new Date()}
                          endMonth={TARGET_END_MONTH}
                          align="start"
                        />
                        {field.value && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 shrink-0"
                            aria-label={t("form.clearTargetDate")}
                            onClick={() => field.onChange("")}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("form.descriptionLabel")}</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={t("form.descriptionPlaceholder")}
                        rows={3}
                        {...field}
                        value={field.value ?? ""}
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
