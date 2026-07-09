import { DomainException } from "../../../../common/exceptions/domain.exception";

/** endDate não pode ser anterior a startDate (série se auto-encerraria vazia). */
export class ScheduledEntryInvalidDateRangeException extends DomainException {
  readonly code = "SCHEDULED_ENTRY_INVALID_DATE_RANGE";

  constructor(startDate: string, endDate: string) {
    super(`Scheduled entry endDate (${endDate}) is before startDate (${startDate})`);
  }
}
