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
}

export interface BudgetFilters {
  month: number
  year: number
}
