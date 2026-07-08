import { z } from "zod"

export const goalSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório").max(80, "Máximo 80 caracteres"),
  targetAmountCents: z.number().int().min(1, "Informe um valor"),
  description: z.string().max(500).optional(),
  /** "" = sem data alvo (vira null no submit). */
  targetDate: z.string().optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Cor inválida"),
})

export type GoalFormValues = z.infer<typeof goalSchema>

export const contributionSchema = z.object({
  amountCents: z.number().int().min(1, "Informe um valor"),
  date: z.string().min(1, "Informe a data"),
  notes: z.string().max(500).optional(),
})

export type ContributionFormValues = z.infer<typeof contributionSchema>
