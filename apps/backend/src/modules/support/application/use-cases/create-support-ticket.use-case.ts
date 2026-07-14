import { Inject, Injectable } from "@nestjs/common";
import {
  SUPPORT_TICKET_REPOSITORY,
  type ISupportTicketRepository,
} from "../../domain/support-ticket.repository.interface";
import type { SupportTicketDetail, SupportTicketCategory } from "../../domain/support-ticket.entity";
import { DispatchNotificationUseCase } from "../../../notifications/application/use-cases/dispatch-notification.use-case";

export interface CreateSupportTicketInput {
  category: SupportTicketCategory;
  subject: string;
  body: string;
}

@Injectable()
export class CreateSupportTicketUseCase {
  constructor(
    @Inject(SUPPORT_TICKET_REPOSITORY) private readonly tickets: ISupportTicketRepository,
    private readonly dispatch: DispatchNotificationUseCase,
  ) {}

  async execute(
    userId: string,
    householdId: string | null,
    authorName: string,
    input: CreateSupportTicketInput,
  ): Promise<SupportTicketDetail> {
    const ticket = await this.tickets.create({
      userId,
      householdId,
      category: input.category,
      subject: input.subject,
      body: input.body,
    });

    const superAdminIds = await this.tickets.findSuperAdminUserIds();
    if (superAdminIds.length > 0) {
      await this.dispatch.execute({
        recipientUserIds: superAdminIds,
        type: "support_ticket_created",
        ticketId: ticket.id,
        subject: ticket.subject,
        authorName,
        data: { ticketId: ticket.id },
      });
    }

    return ticket;
  }
}
