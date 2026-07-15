import { z } from "zod"
import type { TFunction } from "i18next"

// Factories: mensagens de validação traduzidas via i18next (namespace "auth",
// chaves em `validation.*`). Instanciar nos componentes com
// `React.useMemo(() => makeXSchema(t), [t])`.

export const makeLoginSchema = (t: TFunction) =>
  z.object({
    email: z.string().email(t("validation.invalidEmail")),
    password: z.string().min(1, t("validation.passwordRequired")),
  })

export const makeSignupSchema = (t: TFunction) =>
  z
    .object({
      name: z.string().min(2, t("validation.nameMin")),
      email: z.string().email(t("validation.invalidEmail")),
      password: z.string().min(8, t("validation.passwordMin")),
      confirmPassword: z.string().min(1, t("validation.confirmPasswordRequired")),
      // Aceite obrigatório dos Termos/Privacidade (LGPD) — backend re-valida.
      termsAccepted: z
        .boolean()
        .refine((v) => v === true, t("validation.termsRequired")),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: t("validation.passwordsMismatch"),
      path: ["confirmPassword"],
    })

export const makeRecoverSchema = (t: TFunction) =>
  z.object({
    email: z.string().email(t("validation.invalidEmail")),
  })

export const makeResetPasswordSchema = (t: TFunction) =>
  z
    .object({
      password: z.string().min(8, t("validation.passwordMin")),
      confirmPassword: z.string().min(1, t("validation.confirmPasswordRequired")),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: t("validation.passwordsMismatch"),
      path: ["confirmPassword"],
    })

export type LoginFormValues = z.infer<ReturnType<typeof makeLoginSchema>>
export type SignupFormValues = z.infer<ReturnType<typeof makeSignupSchema>>
export type RecoverFormValues = z.infer<ReturnType<typeof makeRecoverSchema>>
export type ResetPasswordFormValues = z.infer<
  ReturnType<typeof makeResetPasswordSchema>
>
