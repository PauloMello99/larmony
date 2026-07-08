export type CategoryType = "income" | "expense" | "both"

export interface Category {
  id: string
  householdId: string
  name: string
  type: CategoryType
  color: string
  icon: string | null
  isDefault: boolean
  createdAt: string
  updatedAt: string
}
