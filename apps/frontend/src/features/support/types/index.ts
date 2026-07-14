export type SupportTicketStatus = "open" | "answered" | "closed"
export type SupportTicketCategory = "problem" | "question" | "suggestion" | "billing"

export interface SupportTicketMessage {
  id: string
  authorUserId: string
  authorName: string
  isAdmin: boolean
  body: string
  createdAt: string
}

export interface SupportTicketRow {
  id: string
  category: SupportTicketCategory
  status: SupportTicketStatus
  subject: string
  createdAt: string
  updatedAt: string
}

/** Linha na inbox do admin — enriquecida com quem abriu. */
export interface AdminSupportTicketRow extends SupportTicketRow {
  authorName: string
  authorEmail: string
  householdName: string | null
}

export interface SupportTicketDetail {
  id: string
  userId: string
  householdId: string | null
  category: SupportTicketCategory
  status: SupportTicketStatus
  subject: string
  createdAt: string
  updatedAt: string
  messages: SupportTicketMessage[]
}

export interface Page<T> {
  data: T[]
  total: number
  page: number
  pages: number
}

export interface AdminSupportTicketFilters {
  page?: number
  limit?: number
  status?: SupportTicketStatus
  category?: SupportTicketCategory
}
