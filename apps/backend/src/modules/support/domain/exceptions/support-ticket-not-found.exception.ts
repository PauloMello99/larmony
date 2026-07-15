import { DomainException } from "../../../../common/exceptions/domain.exception";

export class SupportTicketNotFoundException extends DomainException {
  readonly code = "SUPPORT_TICKET_NOT_FOUND";

  constructor(ticketId: string) {
    super(`Support ticket not found: ${ticketId}`);
  }
}
