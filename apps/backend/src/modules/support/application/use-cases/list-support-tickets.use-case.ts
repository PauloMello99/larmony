import { Inject, Injectable } from "@nestjs/common";
import {
  SUPPORT_TICKET_REPOSITORY,
  type ISupportTicketRepository,
  type ListAdminSupportTicketsFilter,
  type Page,
} from "../../domain/support-ticket.repository.interface";
import type { AdminSupportTicketRow } from "../../domain/support-ticket.entity";

/** Lista de tickets p/ o admin (todas as households, filtro por status/categoria). */
@Injectable()
export class ListSupportTicketsUseCase {
  constructor(
    @Inject(SUPPORT_TICKET_REPOSITORY) private readonly tickets: ISupportTicketRepository,
  ) {}

  execute(filter: ListAdminSupportTicketsFilter): Promise<Page<AdminSupportTicketRow>> {
    return this.tickets.listAll(filter);
  }
}
