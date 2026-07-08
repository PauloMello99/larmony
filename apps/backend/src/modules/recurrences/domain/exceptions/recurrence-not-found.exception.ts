import { DomainException } from "../../../../common/exceptions/domain.exception";

export class RecurrenceNotFoundException extends DomainException {
  readonly code = "RECURRENCE_NOT_FOUND";

  constructor(recurrenceId: string) {
    super(`Recurrence not found: ${recurrenceId}`);
  }
}
