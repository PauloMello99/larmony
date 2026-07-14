import { Inject, Injectable } from "@nestjs/common";
import {
  SUPPORT_TICKET_REPOSITORY,
  type ISupportTicketRepository,
} from "../../domain/support-ticket.repository.interface";
import type { SupportTicketMessageRow } from "../../domain/support-ticket.entity";
import { SupportTicketNotFoundException } from "../../domain/exceptions/support-ticket-not-found.exception";
import { SupportTicketClosedException } from "../../domain/exceptions/support-ticket-closed.exception";
import { DispatchNotificationUseCase } from "../../../notifications/application/use-cases/dispatch-notification.use-case";

/** Resposta do admin: grava a mensagem, marca o ticket como "answered" e avisa o autor. */
@Injectable()
export class ReplyAsAdminUseCase {
  constructor(
    @Inject(SUPPORT_TICKET_REPOSITORY) private readonly tickets: ISupportTicketRepository,
    private readonly dispatch: DispatchNotificationUseCase,
  ) {}

  async execute(
    ticketId: string,
    adminUserId: string,
    body: string,
  ): Promise<SupportTicketMessageRow> {
    const ticket = await this.tickets.findByIdAny(ticketId);
    if (!ticket) throw new SupportTicketNotFoundException(ticketId);
    if (ticket.status === "closed") throw new SupportTicketClosedException(ticketId);

    const message = await this.tickets.addMessage(ticketId, adminUserId, true, body);
    await this.tickets.setStatus(ticketId, "answered");

    await this.dispatch.execute({
      recipientUserIds: [ticket.userId],
      type: "support_reply",
      ticketId: ticket.id,
      subject: ticket.subject,
      data: { ticketId: ticket.id },
    });

    return message;
  }
}
