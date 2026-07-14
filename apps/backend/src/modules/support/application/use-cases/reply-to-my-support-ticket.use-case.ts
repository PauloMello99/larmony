import { Inject, Injectable } from "@nestjs/common";
import {
  SUPPORT_TICKET_REPOSITORY,
  type ISupportTicketRepository,
} from "../../domain/support-ticket.repository.interface";
import type { SupportTicketMessageRow } from "../../domain/support-ticket.entity";
import { SupportTicketNotFoundException } from "../../domain/exceptions/support-ticket-not-found.exception";
import { SupportTicketClosedException } from "../../domain/exceptions/support-ticket-closed.exception";

@Injectable()
export class ReplyToMySupportTicketUseCase {
  constructor(
    @Inject(SUPPORT_TICKET_REPOSITORY) private readonly tickets: ISupportTicketRepository,
  ) {}

  async execute(ticketId: string, userId: string, body: string): Promise<SupportTicketMessageRow> {
    const ticket = await this.tickets.findByIdForUser(ticketId, userId);
    if (!ticket) throw new SupportTicketNotFoundException(ticketId);
    if (ticket.status === "closed") throw new SupportTicketClosedException(ticketId);

    const message = await this.tickets.addMessage(ticketId, userId, false, body);

    // Resposta do usuário reabre um ticket que o admin já tinha respondido.
    if (ticket.status === "answered") {
      await this.tickets.setStatus(ticketId, "open");
    }

    return message;
  }
}
