export type TourStepKind = "modal" | "spotlight"

export interface TourStep {
  kind: TourStepKind
  /**
   * Valor do atributo `data-tour` do elemento alvo (só para `spotlight`).
   * Se o alvo não existir no DOM, o passo é pulado.
   */
  target?: string
  /** Chave i18n (namespace `onboarding`) do título. */
  titleKey: string
  /** Chave i18n (namespace `onboarding`) do corpo. */
  bodyKey: string
  /** Lado preferido do balão em relação ao alvo (Radix ajusta se não couber). */
  placement?: "top" | "right" | "bottom" | "left"
}

export interface TourDef {
  /** Identificador estável e persistido em `users.onboarding`. */
  key: string
  /** Bump para re-disparar o tour a quem já o viu numa versão anterior. */
  version: number
  steps: TourStep[]
}
