"use client"

import { useEffect, useMemo } from "react"
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
import { Input } from "@/shared/components/ui/input"
import { makeCategorySchema, type CategoryFormValues } from "../schemas/category.schemas"
import { CATEGORY_ICON_OPTIONS } from "../lib/icon-options"
import type { Category } from "../types"

/** Chaves i18n (namespace `categories`) — resolvidas no render. */
const TYPE_LABEL_KEY = {
  income: "types.income",
  expense: "types.expense",
  both: "types.both",
} as const

interface CategoryFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  category?: Category | null
  onSubmit: (values: CategoryFormValues) => Promise<void>
}

export function CategoryForm({ open, onOpenChange, category, onSubmit }: CategoryFormProps) {
  const { t } = useTranslation("categories")
  const { t: tCommon } = useTranslation("common")
  const isEditing = !!category

  const categorySchema = useMemo(() => makeCategorySchema(t), [t])

  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: { name: "", type: "expense", color: "#8b8b8b", icon: undefined },
  })

  useEffect(() => {
    if (open) {
      form.reset(
        category
          ? {
              name: category.name,
              type: category.type,
              color: category.color,
              icon: category.icon ?? undefined,
            }
          : { name: "", type: "expense", color: "#8b8b8b", icon: undefined },
      )
    }
  }, [open, category, form])

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

              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("form.typeLabel")}</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {(Object.keys(TYPE_LABEL_KEY) as Array<keyof typeof TYPE_LABEL_KEY>).map(
                          (v) => (
                            <SelectItem key={v} value={v}>
                              {t(TYPE_LABEL_KEY[v])}
                            </SelectItem>
                          ),
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
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

                <FormField
                  control={form.control}
                  name="icon"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("form.iconLabel")}</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t("form.iconPlaceholder")} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {CATEGORY_ICON_OPTIONS.map(({ value, labelKey, Icon }) => (
                            <SelectItem key={value} value={value}>
                              <span className="flex items-center gap-2">
                                <Icon className="h-3.5 w-3.5" />
                                {t(labelKey)}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
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
