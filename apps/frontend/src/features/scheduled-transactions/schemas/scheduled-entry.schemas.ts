import { z } from "zod"
import type { TFunction } from "i18next"

/** Schema com mensagens localizadas — recebe o `t` do namespace `scheduled-transactions`. */
export function makeScheduledEntrySchema(t: TFunction) {
  return z.object({
    postingMode: z.enum(["auto", "manual"]),
    type: z.enum(["income", "expense"]),
    amountCents: z.number().int().min(1, t("validation.amountRequired")),
    description: z
      .string()
      .min(1, t("validation.descriptionRequired"))
      .max(200, t("validation.descriptionMax")),
    frequency: z.enum(["weekly", "monthly", "yearly"]),
    interval: z
      .number()
      .int()
      .min(1, t("validation.intervalMin"))
      .max(365, t("validation.intervalMax")),
    startDate: z.string().min(1, t("validation.startDateRequired")),
    endDate: z.string().nullable().optional(),
    categoryId: z.string().uuid().optional(),
    isActive: z.boolean(),
    /** Só considerado no modo manual — ignorado no auto. */
    reminderDaysBefore: z
      .union([z.literal(1), z.literal(3), z.literal(7), z.literal(15)])
      .nullable(),
    notes: z.string().max(1000).optional(),
  })
}

export type ScheduledEntryFormValues = z.infer<ReturnType<typeof makeScheduledEntrySchema>>
