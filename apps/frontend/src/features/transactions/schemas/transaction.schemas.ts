import { z } from "zod"

export const transactionSchema = z.object({
  type: z.enum(["income", "expense"] as const),
  amountCents: z.number().int().min(1, "Informe um valor"),
  description: z.string().min(1, "Descrição é obrigatória").max(200, "Máximo 200 caracteres"),
  date: z.string().min(1, "Data é obrigatória"),
  categoryId: z.string().uuid().optional(),
  personId: z.string().uuid().optional(),
  notes: z.string().max(1000).optional(),
})

export type TransactionFormValues = z.infer<typeof transactionSchema>
