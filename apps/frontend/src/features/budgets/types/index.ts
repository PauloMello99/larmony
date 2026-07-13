export interface Budget {
  id: string
  householdId: string
  categoryId: string
  categoryName: string
  categoryColor: string
  categoryIcon: string | null
  month: number
  year: number
  limitCents: number
  spentCents: number
  createdAt: string
  updatedAt: string
  /** Período consultado é o mês corrente — só então create/edit/delete são válidos (M10). */
  isEditable: boolean
  /** Período consultado é futuro — limite exibido é projeção do vigente, sem versão própria. */
  isProjected: boolean
}

export interface BudgetFilters {
  month: number
  year: number
}
