/**
 * Fonte única de verdade para versionamento e identificação legal (Termos de
 * Uso + Política de Privacidade). Par acoplado no backend:
 * `apps/backend/src/modules/auth/terms-version.ts` (TERMS_VERSION) — ao mudar
 * a versão aqui, atualizar também a constante lá.
 */

export const LEGAL_VERSION = "2026-07-27"

export const LEGAL_UPDATED_AT = "27 de julho de 2026"

export const CONTROLLER = {
  legalName: "PAULO VINICIUS PACHIANI DE MELLO",
  cnpj: "44.715.602/0001-09",
  address: "Avenida Dois Córregos, 1513",
  dpoEmail: "suporte@larmony.me",
} as const
