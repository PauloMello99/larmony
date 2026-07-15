import { z } from "zod"
import type { TFunction } from "i18next"

// Factories parametrizadas por t() — mensagens de validação vêm do namespace
// "households" (chaves validation.*). Memoizar nos call sites:
// `React.useMemo(() => makeXSchema(t), [t])`.

export function makeCreateHouseholdSchema(t: TFunction) {
  return z.object({
    name: z
      .string()
      .min(2, t("validation.nameMin"))
      .max(80, t("validation.nameMax")),
    // Fuso IANA auto-detectado do navegador (M12) — sem campo visível na criação.
    timezone: z.string().optional(),
  })
}

export type CreateHouseholdFormValues = z.infer<ReturnType<typeof makeCreateHouseholdSchema>>

export function makeUpdateHouseholdSchema(t: TFunction) {
  return z.object({
    name: z.string().min(2, t("validation.nameMin")).max(80, t("validation.nameMax")).optional(),
    timezone: z.string().optional(),
    notificationHour: z.number().int().min(0).max(23).optional(),
  })
}

export type UpdateHouseholdFormValues = z.infer<ReturnType<typeof makeUpdateHouseholdSchema>>

export function makeInviteSchema(t: TFunction) {
  return z.object({
    email: z.string().email(t("validation.emailInvalid")),
    role: z.enum(["owner", "member"] as const),
  })
}

export type InviteFormValues = z.infer<ReturnType<typeof makeInviteSchema>>
