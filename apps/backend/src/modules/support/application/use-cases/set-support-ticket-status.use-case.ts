import { Inject, Injectable } from "@nestjs/common";
import {
  SUPPORT_TICKET_REPOSITORY,
  type ISupportTicketRepository,
} from "../../domain/support-ticket.repository.interface";
import type { SupportTicketStatus } from "../../domain/support-ticket.entity";
import { SupportTicketNotFoundException } from "../../domain/exceptions/support-ticket-not-found.exception";

/** Ajuste manual de status pelo admin (ex.: fechar um ticket resolvido, reabrir). */
@Injectable()
export class SetSupportTicketStatusUseCase {
  constructor(
    @Inject(SUPPORT_TICKET_REPOSITORY) private readonly tickets: ISupportTicketRepository,
  ) {}

  async execute(ticketId: string, status: SupportTicketStatus): Promise<void> {
    const ticket = await this.tickets.findByIdAny(ticketId);
    if (!ticket) throw new SupportTicketNotFoundException(ticketId);
    await this.tickets.setStatus(ticketId, status);
  }
}
