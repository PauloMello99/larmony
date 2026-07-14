import { Inject, Injectable } from "@nestjs/common";
import {
  SUPPORT_TICKET_REPOSITORY,
  type ISupportTicketRepository,
} from "../../domain/support-ticket.repository.interface";
import type { SupportTicketDetail } from "../../domain/support-ticket.entity";
import { SupportTicketNotFoundException } from "../../domain/exceptions/support-ticket-not-found.exception";

/** Detalhe de qualquer ticket p/ o admin (sem escopo de dono — guard já restringe o acesso). */
@Injectable()
export class GetSupportTicketUseCase {
  constructor(
    @Inject(SUPPORT_TICKET_REPOSITORY) private readonly tickets: ISupportTicketRepository,
  ) {}

  async execute(ticketId: string): Promise<SupportTicketDetail> {
    const ticket = await this.tickets.findByIdAny(ticketId);
    if (!ticket) throw new SupportTicketNotFoundException(ticketId);
    return ticket;
  }
}
