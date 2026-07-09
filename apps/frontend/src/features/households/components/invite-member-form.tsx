"use client";

import { useEffect, useMemo } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { makeInviteSchema, type InviteFormValues } from "../schemas/household.schemas";

interface InviteMemberFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: InviteFormValues) => Promise<void>;
}

export function InviteMemberForm({
  open,
  onOpenChange,
  onSubmit,
}: InviteMemberFormProps) {
  const { t } = useTranslation("households");
  const { t: tCommon } = useTranslation("common");
  const schema = useMemo(() => makeInviteSchema(t), [t]);
  const form = useForm<InviteFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", role: "member" },
  });

  useEffect(() => {
    if (open) form.reset({ email: "", role: "member" });
  }, [open, form]);

  const handleSubmit = form.handleSubmit(async (values) => {
    await onSubmit(values);
    onOpenChange(false);
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="gap-0 sm:max-w-md">
        <Form {...form}>
          <form onSubmit={handleSubmit} className="flex h-full flex-col">
            <SheetHeader>
              <SheetTitle>{t("inviteForm.title")}</SheetTitle>
              <SheetDescription>
                {t("inviteForm.description")}
              </SheetDescription>
            </SheetHeader>

            <SheetBody className="flex flex-col gap-4 py-6">
              <div>
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {t("inviteForm.emailLabel")} <span className="text-red-400">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder={t("inviteForm.emailPlaceholder")}
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

              <div>
                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("inviteForm.roleLabel")}</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t("inviteForm.rolePlaceholder")} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="member">{t("roles.member")}</SelectItem>
                          <SelectItem value="owner">{t("roles.owner")}</SelectItem>
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
                {form.formState.isSubmitting ? t("inviteForm.submitting") : t("inviteForm.submit")}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
