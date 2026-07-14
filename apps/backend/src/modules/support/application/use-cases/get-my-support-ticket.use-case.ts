import { Inject, Injectable } from "@nestjs/common";
import {
  SUPPORT_TICKET_REPOSITORY,
  type ISupportTicketRepository,
} from "../../domain/support-ticket.repository.interface";
import type { SupportTicketDetail } from "../../domain/support-ticket.entity";
import { SupportTicketNotFoundException } from "../../domain/exceptions/support-ticket-not-found.exception";

@Injectable()
export class GetMySupportTicketUseCase {
  constructor(
    @Inject(SUPPORT_TICKET_REPOSITORY) private readonly tickets: ISupportTicketRepository,
  ) {}

  async execute(ticketId: string, userId: string): Promise<SupportTicketDetail> {
    const ticket = await this.tickets.findByIdForUser(ticketId, userId);
    if (!ticket) throw new SupportTicketNotFoundException(ticketId);
    return ticket;
  }
}
