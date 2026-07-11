"use client"

import { useEffect, useMemo } from "react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { zodResolver } from "@hookform/resolvers/zod"
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
import { makeUpdateHouseholdSchema, type UpdateHouseholdFormValues } from "../schemas/household.schemas"
import type { HouseholdSummary } from "@/features/dashboard/hooks/use-households"

interface EditHouseholdFormProps {
  household: HouseholdSummary
  onSubmit: (values: UpdateHouseholdFormValues) => Promise<void>
}

export function EditHouseholdForm({ household, onSubmit }: EditHouseholdFormProps) {
  const { t } = useTranslation("households")
  const schema = useMemo(() => makeUpdateHouseholdSchema(t), [t])
  const form = useForm<UpdateHouseholdFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: household.name },
  })

  useEffect(() => {
    form.reset({ name: household.name })
  }, [household.name, form])

  const handleSubmit = form.handleSubmit(async (values) => {
    await onSubmit(values)
  })

  return (
    <Form {...form}>
      <form onSubmit={handleSubmit} className="grid gap-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("editForm.nameLabel")}</FormLabel>
              <FormControl>
                <Input placeholder={t("editForm.namePlaceholder")} autoComplete="off" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Slug is auto-generated and read-only */}
        <div className="grid gap-1.5">
          <span className="text-sm font-medium leading-none text-foreground/70">
            {t("editForm.slugLabel")}
          </span>
          <div className="flex h-9 items-center rounded-md border border-foreground/10 bg-foreground/[0.03] px-3 font-mono text-sm text-foreground/40 select-all">
            {household.slug}
          </div>
          <p className="text-xs text-foreground/30">
            {t("editForm.slugHint")}
          </p>
        </div>

        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={form.formState.isSubmitting || !form.formState.isDirty}
            className="w-full sm:w-auto"
          >
            {form.formState.isSubmitting ? t("editForm.saving") : t("editForm.submit")}
          </Button>
        </div>
      </form>
    </Form>
  )
}
