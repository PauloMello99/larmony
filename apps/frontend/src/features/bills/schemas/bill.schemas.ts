import { z } from "zod"

export const billSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório").max(80, "Máximo 80 caracteres"),
  amountCents: z.number().int().min(1, "Informe um valor"),
  dueDay: z.number().int().min(1, "Dia inválido").max(31, "Dia inválido"),
  categoryId: z.string().uuid().optional(),
  isActive: z.boolean(),
  reminderDaysBefore: z.union([z.literal(1), z.literal(3), z.literal(7), z.literal(15)]).nullable(),
  notes: z.string().max(1000).optional(),
})

export type BillFormValues = z.infer<typeof billSchema>
