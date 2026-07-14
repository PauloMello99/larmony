import { IsIn } from "class-validator";
import type { SupportTicketStatus } from "../../domain/support-ticket.entity";

const STATUSES: SupportTicketStatus[] = ["open", "answered", "closed"];

export class SetSupportTicketStatusDto {
  @IsIn(STATUSES)
  status!: SupportTicketStatus;
}
