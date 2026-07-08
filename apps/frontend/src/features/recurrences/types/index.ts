export type RecurrenceType = "income" | "expense"
export type RecurrenceFrequency = "weekly" | "monthly" | "yearly"

export interface Recurrence {
  id: string
  householdId: string
  createdBy: string
  personId: string | null
  personName: string | null
  categoryId: string | null
  categoryName: string | null
  categoryColor: string | null
  categoryIcon: string | null
  type: RecurrenceType
  amountCents: number
  description: string
  frequency: RecurrenceFrequency
  interval: number
  startDate: string
  endDate: string | null
  nextRunDate: string
  isActive: boolean
  notes: string | null
}
