import { z } from "zod"

export const createHouseholdSchema = z.object({
  name: z.string().min(2, "Mínimo 2 caracteres").max(80, "Máximo 80 caracteres"),
})

export type CreateHouseholdFormValues = z.infer<typeof createHouseholdSchema>

export const updateHouseholdSchema = createHouseholdSchema.partial()

export type UpdateHouseholdFormValues = z.infer<typeof updateHouseholdSchema>

export const inviteSchema = z.object({
  email: z.string().email("E-mail inválido"),
  role: z.enum(["owner", "member"] as const),
})

export type InviteFormValues = z.infer<typeof inviteSchema>
