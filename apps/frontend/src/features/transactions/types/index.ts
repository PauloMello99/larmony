export type TransactionType = "income" | "expense"

export interface Transaction {
  id: string
  householdId: string
  createdBy: string
  type: TransactionType
  amountCents: number
  description: string
  date: string
  notes: string | null
  categoryId: string | null
  categoryName: string | null
  categoryColor: string | null
  categoryIcon: string | null
  personId: string | null
  personName: string | null
  createdAt: string
  updatedAt: string
}

export interface TransactionListResponse {
  items: Transaction[]
  total: number
}

export interface TransactionFilters {
  month?: number
  year?: number
  type?: TransactionType
  categoryId?: string
}
