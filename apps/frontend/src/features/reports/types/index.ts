export interface MonthPoint {
  year: number
  month: number
  incomeCents: number
  expenseCents: number
}

export interface MonthTotals {
  incomeCents: number
  expenseCents: number
  balanceCents: number
}

export interface CategorySlice {
  categoryId: string | null
  name: string
  color: string
  amountCents: number
}

export interface PersonSlice {
  userId: string | null
  name: string
  amountCents: number
}

export interface MonthlyReport {
  months: MonthPoint[]
  byCategory: CategorySlice[]
  byPerson: PersonSlice[]
  refMonth: { month: number; year: number }
}

export interface AnnualReport {
  year: number
  months: MonthPoint[]
  totals: MonthTotals
}

export type ReportView = "monthly" | "annual"
