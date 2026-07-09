import { z } from "zod"
import type { TFunction } from "i18next"

/**
 * Factory: as mensagens de validação vêm do namespace `transactions`
 * (chaves `validation.*`), então o schema precisa do `t` ativo. Memoizar no
 * call site: `React.useMemo(() => makeTransactionSchema(t), [t])`.
 */
export function makeTransactionSchema(t: TFunction) {
  return z.object({
    type: z.enum(["income", "expense"] as const),
    amountCents: z.number().int().min(1, t("validation.amountRequired")),
    description: z
      .string()
      .min(1, t("validation.descriptionRequired"))
      .max(200, t("validation.descriptionMax")),
    date: z.string().min(1, t("validation.dateRequired")),
    categoryId: z.string().uuid().optional(),
    personId: z.string().uuid().optional(),
    notes: z.string().max(1000).optional(),
  })
}

export interface MemberShareInput {
  userId: string
  shareAmountCents: number | null
}

/**
 * Payload submetido à API — as chaves base vêm do zod; `installmentCount` e
 * `members` são compostas pela UI (toggles/modo) fora da validação do form.
 */
export type TransactionFormValues = z.infer<ReturnType<typeof makeTransactionSchema>> & {
  installmentCount?: number
  members?: MemberShareInput[]
}
