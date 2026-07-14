// Espelha os enums `support_ticket_status`/`support_ticket_category` do schema.
export type SupportTicketStatus = "open" | "answered" | "closed";
export type SupportTicketCategory = "problem" | "question" | "suggestion" | "billing";

export interface SupportTicketMessageRow {
  id: string;
  authorUserId: string;
  authorName: string;
  isAdmin: boolean;
  body: string;
  createdAt: Date;
}

/** Linha de ticket em listas (própria do usuário ou todas, para o admin). */
export interface SupportTicketRow {
  id: string;
  category: SupportTicketCategory;
  status: SupportTicketStatus;
  subject: string;
  createdAt: Date;
  updatedAt: Date;
}

/** Linha de ticket na lista do admin — enriquecida com quem abriu. */
export interface AdminSupportTicketRow extends SupportTicketRow {
  authorName: string;
  authorEmail: string;
  householdName: string | null;
}

/** Detalhe de um ticket (thread completa) — usado por usuário e admin. */
export interface SupportTicketDetail {
  id: string;
  userId: string;
  householdId: string | null;
  category: SupportTicketCategory;
  status: SupportTicketStatus;
  subject: string;
  createdAt: Date;
  updatedAt: Date;
  messages: SupportTicketMessageRow[];
}
