"use client"

import { useEffect, useMemo } from "react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
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
import { formatDate, useActiveLocale } from "@/shared/lib/format"
import {
  makeScheduledEntrySchema,
  type ScheduledEntryFormValues,
} from "../schemas/scheduled-entry.schemas"
import type { ScheduledEntry, ScheduledEntryType } from "../types"

const REMINDER_OPTIONS = [
  { value: "none", days: null },
  { value: "1", days: 1 },
  { value: "3", days: 3 },
  { value: "7", days: 7 },
  { value: "15", days: 15 },
] as const

const FREQUENCY_OPTIONS = [
  { value: "weekly", labelKey: "frequency.weekly" },
  { value: "monthly", labelKey: "frequency.monthly" },
  { value: "yearly", labelKey: "frequency.yearly" },
] as const

const TYPE_OPTIONS = [
  { value: "expense", labelKey: "form.typeExpense" },
  { value: "income", labelKey: "form.typeIncome" },
] as const

function makeDefaultValues(todayISO: string): ScheduledEntryFormValues {
  return {
    postingMode: "manual",
    type: "expense",
    amountCents: 0,
    description: "",
    frequency: "monthly",
    interval: 1,
    startDate: todayISO,
    endDate: null,
    categoryId: undefined,
    isActive: true,
    reminderDaysBefore: null,
    notes: undefined,
  }
}

interface ScheduledEntryFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  householdId: string
  entry?: ScheduledEntry | null
  onSubmit: (values: ScheduledEntryFormValues) => Promise<void>
}

export function ScheduledEntryForm({
  open,
  onOpenChange,
  householdId,
  entry,
  onSubmit,
}: ScheduledEntryFormProps) {
  const { t } = useTranslation("scheduled-transactions")
  const { t: tCommon } = useTranslation("common")
  const locale = useActiveLocale()
  const isEditing = !!entry
  const { categories } = useCategories(householdId)

  const today = new Date()
  const todayISO = format(today, "yyyy-MM-dd")

  const schema = useMemo(() => makeScheduledEntrySchema(t), [t])
  const form = useForm<ScheduledEntryFormValues>({
    resolver: zodResolver(schema),
    defaultValues: makeDefaultValues(todayISO),
  })

  const selectedType = form.watch("type")
  const postingMode = form.watch("postingMode")
  const compatibleCategories = categories.filter(
    (c) => c.type === selectedType || c.type === "both",
  )

  // Modo auto não permite início no passado (sem backfill do engine); modo
  // manual permite (ex.: uma conta que já existe há anos).
  const startMonth =
    postingMode === "auto"
      ? new Date(today.getFullYear(), today.getMonth())
      : new Date(today.getFullYear() - 10, 0)
  const endMonth = new Date(today.getFullYear() + 10, 11)

  useEffect(() => {
    if (open) {
      form.reset(
        entry
          ? {
              postingMode: entry.postingMode,
              type: entry.type,
              amountCents: entry.amountCents,
              description: entry.description,
              frequency: entry.frequency,
              interval: entry.interval,
              startDate: entry.startDate,
              endDate: entry.endDate,
              categoryId: entry.categoryId ?? undefined,
              isActive: entry.isActive,
              reminderDaysBefore: entry.reminderDaysBefore as ScheduledEntryFormValues["reminderDaysBefore"],
              notes: entry.notes ?? undefined,
            }
          : makeDefaultValues(todayISO),
      )
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, entry])

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
                name="postingMode"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between rounded-lg border border-foreground/[0.08] px-3 py-2.5">
                      <div>
                        <Label htmlFor="entry-auto" className="text-sm font-normal">
                          {t("form.postingModeLabel")}
                        </Label>
                        <p className="text-xs text-foreground/40">
                          {field.value === "auto"
                            ? t("form.postingModeAutoHint")
                            : t("form.postingModeManualHint")}
                        </p>
                      </div>
                      <FormControl>
                        <Switch
                          id="entry-auto"
                          checked={field.value === "auto"}
                          onCheckedChange={(checked) => field.onChange(checked ? "auto" : "manual")}
                        />
                      </FormControl>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("form.typeLabel")}</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={(v) => field.onChange(v as ScheduledEntryType)}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {TYPE_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {t(opt.labelKey)}
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
                        {t("form.amountLabel")} <span className="text-red-400">*</span>
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
                      {t("form.descriptionLabel")} <span className="text-red-400">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t("form.descriptionPlaceholder")}
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
                  name="frequency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("form.frequencyLabel")}</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {FREQUENCY_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {t(opt.labelKey)}
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
                      <FormLabel>{t("form.intervalLabel")}</FormLabel>
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
                    <FormLabel>{t("form.startLabel")}</FormLabel>
                    {isEditing ? (
                      <p className="rounded-md border border-foreground/[0.08] bg-foreground/[0.02] px-3 py-2 text-sm text-foreground/50">
                        {t("form.startImmutable", {
                          date: formatDate(field.value, locale, {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                          }),
                        })}
                      </p>
                    ) : (
                      <FormControl>
                        <DatePicker
                          value={field.value}
                          onChange={field.onChange}
                          startMonth={startMonth}
                          endMonth={endMonth}
                          placeholder={t("form.startPlaceholder")}
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
                    <FormLabel>{t("form.endLabel")}</FormLabel>
                    <div className="flex items-center gap-2">
                      <FormControl>
                        <DatePicker
                          value={field.value ?? ""}
                          onChange={(v) => field.onChange(v || null)}
                          startMonth={startMonth}
                          endMonth={endMonth}
                          placeholder={t("form.endPlaceholder")}
                        />
                      </FormControl>
                      {field.value && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => field.onChange(null)}
                        >
                          {t("form.clear")}
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
                    <FormLabel>{t("form.categoryLabel")}</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t("form.categoryPlaceholder")} />
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

              {postingMode === "manual" && (
                <FormField
                  control={form.control}
                  name="reminderDaysBefore"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("form.reminderLabel")}</FormLabel>
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
                              {opt.days === null
                                ? t("form.reminderNone")
                                : t("form.reminderDaysBefore", { count: opt.days })}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {isEditing && (
                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between rounded-lg border border-foreground/[0.08] px-3 py-2.5">
                        <Label htmlFor="entry-active" className="text-sm font-normal">
                          {t("form.activeLabel")}
                        </Label>
                        <FormControl>
                          <Switch
                            id="entry-active"
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
                    <FormLabel>{t("form.notesLabel")}</FormLabel>
                    <FormControl>
                      <Textarea placeholder={t("form.notesPlaceholder")} rows={3} {...field} />
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
