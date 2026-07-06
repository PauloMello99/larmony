"use client";

import { useForm } from "react-hook-form";
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
  createHouseholdSchema,
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
  const form = useForm<CreateHouseholdFormValues>({
    resolver: zodResolver(createHouseholdSchema),
    defaultValues: { name: "" },
  });

  const handleSubmit = form.handleSubmit(async (values) => {
    await onSubmit(values);
    form.reset();
    onOpenChange(false);
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="gap-0 sm:max-w-md">
        <Form {...form}>
          <form onSubmit={handleSubmit} className="flex h-full flex-col">
            <SheetHeader>
              <SheetTitle>Novo lar</SheetTitle>
              <SheetDescription>
                Crie um espaço para o seu lar. Você será o proprietário.
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
                        Nome <span className="text-red-400">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Ex: Casa da Família"
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
            </SheetBody>

            <SheetFooter>
              <SheetClose asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full sm:w-auto"
                >
                  Cancelar
                </Button>
              </SheetClose>
              <Button
                type="submit"
                disabled={form.formState.isSubmitting}
                className="w-full sm:w-auto"
              >
                {form.formState.isSubmitting ? "Criando…" : "Criar lar"}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
