"use client"

import { useEffect } from "react"
import { useForm } from "react-hook-form"
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
import { updateHouseholdSchema, type UpdateHouseholdFormValues } from "../schemas/household.schemas"
import type { HouseholdSummary } from "@/features/dashboard/hooks/use-households"

interface EditHouseholdFormProps {
  household: HouseholdSummary
  onSubmit: (values: UpdateHouseholdFormValues) => Promise<void>
}

export function EditHouseholdForm({ household, onSubmit }: EditHouseholdFormProps) {
  const form = useForm<UpdateHouseholdFormValues>({
    resolver: zodResolver(updateHouseholdSchema),
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
              <FormLabel>Nome da lar</FormLabel>
              <FormControl>
                <Input placeholder="Ex: Studio Ink" autoComplete="off" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Slug is auto-generated and read-only */}
        <div className="grid gap-1.5">
          <span className="text-sm font-medium leading-none text-foreground/70">
            Identificador (slug)
          </span>
          <div className="flex h-9 items-center rounded-md border border-foreground/10 bg-foreground/[0.03] px-3 font-mono text-sm text-foreground/40 select-all">
            {household.slug}
          </div>
          <p className="text-xs text-foreground/30">
            Gerado automaticamente — não pode ser alterado.
          </p>
        </div>

        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={form.formState.isSubmitting || !form.formState.isDirty}
            className="w-full sm:w-auto"
          >
            {form.formState.isSubmitting ? "Salvando…" : "Salvar alterações"}
          </Button>
        </div>
      </form>
    </Form>
  )
}
