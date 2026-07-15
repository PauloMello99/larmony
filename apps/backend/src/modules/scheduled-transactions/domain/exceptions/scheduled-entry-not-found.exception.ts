import { DomainException } from "../../../../common/exceptions/domain.exception";

export class ScheduledEntryNotFoundException extends DomainException {
  readonly code = "SCHEDULED_ENTRY_NOT_FOUND";

  constructor(entryId: string) {
    super(`Scheduled entry not found: ${entryId}`);
  }
}
