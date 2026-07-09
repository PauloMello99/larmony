import { z } from "zod"
import type { TFunction } from "i18next"

/** Schema como factory — mensagens de validação vêm do i18n (namespace `goals`). */
export function makeGoalSchema(t: TFunction) {
  return z.object({
    name: z
      .string()
      .min(1, t("validation.nameRequired"))
      .max(80, t("validation.nameMax")),
    targetAmountCents: z.number().int().min(1, t("validation.amountRequired")),
    description: z.string().max(500).optional(),
    /** "" = sem data alvo (vira null no submit). */
    targetDate: z.string().optional(),
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/, t("validation.colorInvalid")),
  })
}

export type GoalFormValues = z.infer<ReturnType<typeof makeGoalSchema>>

export function makeContributionSchema(t: TFunction) {
  return z.object({
    amountCents: z.number().int().min(1, t("validation.amountRequired")),
    date: z.string().min(1, t("validation.dateRequired")),
    notes: z.string().max(500).optional(),
  })
}

export type ContributionFormValues = z.infer<ReturnType<typeof makeContributionSchema>>
