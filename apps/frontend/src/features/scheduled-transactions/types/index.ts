export type ScheduledEntryPostingMode = "auto" | "manual"
export type ScheduledEntryType = "income" | "expense"
export type ScheduledEntryFrequency = "weekly" | "monthly" | "yearly"

export interface ScheduledEntry {
  id: string
  householdId: string
  /** auto = engine gera a transação; manual = lembrete + botão "lançar". */
  postingMode: ScheduledEntryPostingMode
  createdBy: string
  personId: string | null
  personName: string | null
  categoryId: string | null
  categoryName: string | null
  categoryColor: string | null
  categoryIcon: string | null
  type: ScheduledEntryType
  amountCents: number
  description: string
  frequency: ScheduledEntryFrequency
  interval: number
  startDate: string
  endDate: string | null
  isActive: boolean
  notes: string | null
  /** Cursor do engine — só modo auto (persistido). NULL no modo manual. */
  nextRunDate: string | null
  /** Próxima ocorrência calculada — só modo manual. NULL no modo auto (usar nextRunDate). */
  dueDate: string | null
  daysUntilDue: number | null
  /** Dias antes da ocorrência p/ lembrete por e-mail — só modo manual. */
  reminderDaysBefore: number | null
}
