import type { TFunction } from "i18next"
import { ApiError } from "@/infrastructure/api/client"

/**
 * Traduz um erro de chamada à API para exibição ao usuário. O backend responde
 * sempre em pt-BR; a UI traduz pelo `code` estável do erro de domínio (chaves
 * `api.*` do namespace `common`), com fallback gracioso para a mensagem
 * verbatim do backend quando o código é desconhecido.
 *
 * `t` deve estar vinculado ao namespace `common` (`useTranslation("common")`).
 */
export function translateApiError(error: unknown, t: TFunction): string {
  if (error instanceof ApiError) {
    if (error.status === 0) return t("api.NETWORK")
    if (error.code) return t(`api.${error.code}`, { defaultValue: error.message })
    if (error.status >= 500) return t("api.UNEXPECTED")
    return error.message
  }
  if (error instanceof Error) return error.message
  return t("api.UNEXPECTED")
}
