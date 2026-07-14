import { DomainException } from "../../../../common/exceptions/domain.exception";

export class SupportTicketClosedException extends DomainException {
  readonly code = "SUPPORT_TICKET_CLOSED";

  constructor(ticketId: string) {
    super(`Support ticket is closed, cannot reply: ${ticketId}`);
  }
}
