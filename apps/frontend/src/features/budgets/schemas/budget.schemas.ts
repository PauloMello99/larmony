import { z } from "zod"

export const createBudgetSchema = z.object({
  categoryId: z.string().uuid("Selecione uma categoria"),
  amountCents: z.number().int().min(1, "Informe um limite"),
})

export type CreateBudgetFormValues = z.infer<typeof createBudgetSchema>
