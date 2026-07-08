import { z } from "zod"

export const recurrenceSchema = z.object({
  type: z.enum(["income", "expense"]),
  amountCents: z.number().int().min(1, "Informe um valor"),
  description: z
    .string()
    .min(1, "Descrição é obrigatória")
    .max(200, "Máximo 200 caracteres"),
  frequency: z.enum(["weekly", "monthly", "yearly"]),
  interval: z.number().int().min(1, "Mínimo 1").max(365, "Máximo 365"),
  startDate: z.string().min(1, "Informe a data de início"),
  endDate: z.string().nullable().optional(),
  categoryId: z.string().uuid().optional(),
  isActive: z.boolean(),
  notes: z.string().max(1000).optional(),
})

export type RecurrenceFormValues = z.infer<typeof recurrenceSchema>
