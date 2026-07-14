import { Inject, Injectable } from "@nestjs/common";
import {
  SUPPORT_TICKET_REPOSITORY,
  type ISupportTicketRepository,
  type Page,
  type PageFilter,
} from "../../domain/support-ticket.repository.interface";
import type { SupportTicketRow } from "../../domain/support-ticket.entity";

@Injectable()
export class ListMySupportTicketsUseCase {
  constructor(
    @Inject(SUPPORT_TICKET_REPOSITORY) private readonly tickets: ISupportTicketRepository,
  ) {}

  execute(userId: string, filter: PageFilter): Promise<Page<SupportTicketRow>> {
    return this.tickets.listByUser(userId, filter);
  }
}
