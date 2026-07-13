"use client";

import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Sheet,
  SheetBody,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/shared/components/ui/sheet";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/shared/components/ui/form";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { browserTimeZone, IANA_TIMEZONES } from "@/shared/lib/timezones";
import {
  makeCreateHouseholdSchema,
  type CreateHouseholdFormValues,
} from "../schemas/household.schemas";

interface CreateHouseholdFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: CreateHouseholdFormValues) => Promise<void>;
}

export function CreateHouseholdForm({
  open,
  onOpenChange,
  onSubmit,
}: CreateHouseholdFormProps) {
  const { t } = useTranslation("households");
  const { t: tCommon } = useTranslation("common");
  const schema = useMemo(() => makeCreateHouseholdSchema(t), [t]);
  const form = useForm<CreateHouseholdFormValues>({
    resolver: zodResolver(schema),
    // Fuso do lar (M12) pré-preenchido do navegador do criador — visível e
    // editável já na criação (adendo ADR-0024); segue editável depois em
    // Configurações do lar.
    defaultValues: { name: "", timezone: browserTimeZone() },
  });

  const handleSubmit = form.handleSubmit(async (values) => {
    await onSubmit({ ...values, timezone: values.timezone ?? browserTimeZone() });
    form.reset();
    onOpenChange(false);
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="gap-0 sm:max-w-md">
        <Form {...form}>
          <form onSubmit={handleSubmit} className="flex h-full flex-col">
            <SheetHeader>
              <SheetTitle>{t("createForm.title")}</SheetTitle>
              <SheetDescription>
                {t("createForm.description")}
              </SheetDescription>
            </SheetHeader>

            <SheetBody className="flex flex-col gap-4 py-6">
              <div>
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {t("createForm.nameLabel")} <span className="text-red-400">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder={t("createForm.namePlaceholder")}
                          autoComplete="off"
                          autoFocus
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="timezone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("createForm.timezoneLabel")}</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="max-h-72">
                        {IANA_TIMEZONES.map((tz) => (
                          <SelectItem key={tz} value={tz}>
                            {tz.replace(/_/g, " ")}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-foreground/30">
                      {t("createForm.timezoneHint")}
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </SheetBody>

            <SheetFooter>
              <SheetClose asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full sm:w-auto"
                >
                  {tCommon("actions.cancel")}
                </Button>
              </SheetClose>
              <Button
                type="submit"
                disabled={form.formState.isSubmitting}
                className="w-full sm:w-auto"
              >
                {form.formState.isSubmitting ? t("createForm.submitting") : t("createForm.submit")}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
