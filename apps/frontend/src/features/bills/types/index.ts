export interface Bill {
  id: string
  householdId: string
  categoryId: string | null
  categoryName: string | null
  categoryColor: string | null
  categoryIcon: string | null
  name: string
  amountCents: number
  dueDay: number
  isActive: boolean
  notes: string | null
  reminderDaysBefore: number | null
  dueDate: string
  daysUntilDue: number
}
