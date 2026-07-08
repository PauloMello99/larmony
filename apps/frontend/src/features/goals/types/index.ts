export interface Goal {
  id: string
  householdId: string
  name: string
  description: string | null
  targetAmountCents: number
  targetDate: string | null
  color: string
  savedCents: number
  createdAt: string
  updatedAt: string
}

export interface GoalContribution {
  id: string
  goalId: string
  createdBy: string
  authorName: string | null
  amountCents: number
  date: string
  notes: string | null
  createdAt: string
}
