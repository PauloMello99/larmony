"use client"

import { useEffect, useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { zodResolver } from "@hookform/resolvers/zod"
import { format, parse } from "date-fns"
import { Trash2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog"
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
import { CurrencyInput } from "@/shared/components/ui/currency-input"
import { DatePicker } from "@/shared/components/ui/date-picker"
import { Skeleton } from "@/shared/components/ui/skeleton"
import { formatCentsToBRL } from "@/shared/lib/currency"
import { getDateFnsLocale, useActiveLocale } from "@/shared/lib/format"
import { useGoalContributions } from "../hooks/use-goal-contributions"
import { makeContributionSchema, type ContributionFormValues } from "../schemas/goal.schemas"
import type { Goal, GoalContribution } from "../types"

function todayISO(): string {
  return format(new Date(), "yyyy-MM-dd")
}

interface ContributionDialogProps {
  householdId: string
  goal: Goal | null
  onOpenChange: (open: boolean) => void
  onSubmit: (goalId: string, values: ContributionFormValues) => Promise<void>
  onDeleteContribution: (goalId: string, contributionId: string) => Promise<void>
}

export function ContributionDialog({
  householdId,
  goal,
  onOpenChange,
  onSubmit,
  onDeleteContribution,
}: ContributionDialogProps) {
  const { t } = useTranslation("goals")
  const locale = useActiveLocale()
  const { contributions, loading } = useGoalContributions(householdId, goal?.id ?? null)
  const [removingId, setRemovingId] = useState<string | null>(null)

  const contributionSchema = useMemo(() => makeContributionSchema(t), [t])

  const form = useForm<ContributionFormValues>({
    resolver: zodResolver(contributionSchema),
    defaultValues: { amountCents: 0, date: todayISO(), notes: undefined },
  })

  useEffect(() => {
    if (goal) form.reset({ amountCents: 0, date: todayISO(), notes: undefined })
  }, [goal, form])

  const handleSubmit = form.handleSubmit(async (values) => {
    if (!goal) return
    await onSubmit(goal.id, values)
    form.reset({ amountCents: 0, date: todayISO(), notes: undefined })
  })

  async function handleRemove(contribution: GoalContribution) {
    if (!goal) return
    setRemovingId(contribution.id)
    try {
      await onDeleteContribution(goal.id, contribution.id)
    } finally {
      setRemovingId(null)
    }
  }

  return (
    <Dialog open={!!goal} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("contributionDialog.title", { name: goal?.name ?? "" })}</DialogTitle>
          <DialogDescription>
            {goal
              ? t("contributionDialog.summary", {
                  saved: formatCentsToBRL(goal.savedCents),
                  target: formatCentsToBRL(goal.targetAmountCents),
                })
              : null}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={handleSubmit} className="grid gap-3">
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="amountCents"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t("contributionDialog.amountLabel")} <span className="text-red-400">*</span>
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
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("contributionDialog.dateLabel")}</FormLabel>
                    <FormControl>
                      <DatePicker value={field.value} onChange={field.onChange} align="end" />
                    </FormControl>
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
                  <FormLabel>{t("contributionDialog.notesLabel")}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t("contributionDialog.notesPlaceholder")}
                      autoComplete="off"
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={form.formState.isSubmitting} className="w-full">
              {form.formState.isSubmitting
                ? t("contributionDialog.submitting")
                : t("contributionDialog.submit")}
            </Button>
          </form>
        </Form>

        <div className="mt-2">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-foreground/50">
            {t("contributionDialog.history")}
          </p>
          {loading ? (
            <Skeleton className="h-16 w-full rounded-lg" />
          ) : contributions.length === 0 ? (
            <p className="rounded-lg border border-dashed border-foreground/10 py-4 text-center text-sm text-foreground/30">
              {t("contributionDialog.empty")}
            </p>
          ) : (
            <ul className="max-h-48 divide-y divide-foreground/[0.06] overflow-y-auto">
              {contributions.map((c) => (
                <li key={c.id} className="flex items-center gap-3 py-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">
                      {formatCentsToBRL(c.amountCents)}
                    </p>
                    <p className="truncate text-xs text-foreground/40">
                      {format(parse(c.date, "yyyy-MM-dd", new Date()), "dd/MM/yyyy", {
                        locale: getDateFnsLocale(locale),
                      })}
                      {c.authorName ? ` · ${c.authorName}` : ""}
                      {c.notes ? ` · ${c.notes}` : ""}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0 text-foreground/40 hover:text-red-400"
                    aria-label={t("contributionDialog.deleteContribution")}
                    disabled={removingId === c.id}
                    onClick={() => handleRemove(c)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
