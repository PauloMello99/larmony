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
  })
}

export type CreateHouseholdFormValues = z.infer<ReturnType<typeof makeCreateHouseholdSchema>>

export function makeUpdateHouseholdSchema(t: TFunction) {
  return makeCreateHouseholdSchema(t).partial()
}

export type UpdateHouseholdFormValues = z.infer<ReturnType<typeof makeUpdateHouseholdSchema>>

export function makeInviteSchema(t: TFunction) {
  return z.object({
    email: z.string().email(t("validation.emailInvalid")),
    role: z.enum(["owner", "member"] as const),
  })
}

export type InviteFormValues = z.infer<ReturnType<typeof makeInviteSchema>>
