import type {
  AdminSupportTicketRow,
  SupportTicketCategory,
  SupportTicketDetail,
  SupportTicketMessageRow,
  SupportTicketRow,
  SupportTicketStatus,
} from "./support-ticket.entity";

export const SUPPORT_TICKET_REPOSITORY = Symbol("SUPPORT_TICKET_REPOSITORY");

/** Envelope de paginação — mesmo shape usado pelo painel admin (`Page<T>`). */
export interface Page<T> {
  data: T[];
  total: number;
  page: number;
  pages: number;
}

export interface PageFilter {
  page?: number;
  limit?: number;
}

export interface ListAdminSupportTicketsFilter extends PageFilter {
  status?: SupportTicketStatus;
  category?: SupportTicketCategory;
}

export interface CreateSupportTicketData {
  userId: string;
  householdId: string | null;
  category: SupportTicketCategory;
  subject: string;
  body: string;
}

export interface ISupportTicketRepository {
  create(data: CreateSupportTicketData): Promise<SupportTicketDetail>;
  /** Escopado por userId — dono de outro ticket recebe null (404, não 403). */
  findByIdForUser(ticketId: string, userId: string): Promise<SupportTicketDetail | null>;
  /** Sem escopo — uso exclusivo do admin (guard já restringe o acesso). */
  findByIdAny(ticketId: string): Promise<SupportTicketDetail | null>;
  listByUser(userId: string, filter: PageFilter): Promise<Page<SupportTicketRow>>;
  listAll(filter: ListAdminSupportTicketsFilter): Promise<Page<AdminSupportTicketRow>>;
  addMessage(
    ticketId: string,
    authorUserId: string,
    isAdmin: boolean,
    body: string,
  ): Promise<SupportTicketMessageRow>;
  setStatus(ticketId: string, status: SupportTicketStatus): Promise<void>;
  /** Contagem de tickets abertos (badge do nav admin). */
  countOpen(): Promise<number>;
  /** Destinatários do aviso de "ticket aberto" (matriz não existe — todo super_admin). */
  findSuperAdminUserIds(): Promise<string[]>;
}
