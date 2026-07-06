import { z } from "zod"

export const categorySchema = z.object({
  name: z.string().min(1, "Nome é obrigatório").max(60, "Máximo 60 caracteres"),
  type: z.enum(["income", "expense", "both"] as const),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Cor inválida"),
  icon: z.string().max(60).optional(),
})

export type CategoryFormValues = z.infer<typeof categorySchema>
