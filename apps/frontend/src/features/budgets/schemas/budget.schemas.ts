import { z } from "zod"
import type { TFunction } from "i18next"

export function makeCreateBudgetSchema(t: TFunction) {
  return z.object({
    categoryId: z.string().uuid(t("validation.categoryRequired")),
    amountCents: z.number().int().min(1, t("validation.limitRequired")),
  })
}

export type CreateBudgetFormValues = z.infer<ReturnType<typeof makeCreateBudgetSchema>>
