import { z } from "zod"
import type { TFunction } from "i18next"

/** Schema como factory — mensagens de validação vêm do i18n (namespace `categories`). */
export function makeCategorySchema(t: TFunction) {
  return z.object({
    name: z
      .string()
      .min(1, t("validation.nameRequired"))
      .max(60, t("validation.nameMax")),
    type: z.enum(["income", "expense", "both"] as const),
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/, t("validation.colorInvalid")),
    icon: z.string().max(60).optional(),
  })
}

export type CategoryFormValues = z.infer<ReturnType<typeof makeCategorySchema>>
