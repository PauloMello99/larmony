import { DomainException } from "../../../../common/exceptions/domain.exception";

/** endDate não pode ser anterior a startDate (série se auto-encerraria vazia). */
export class RecurrenceInvalidDateRangeException extends DomainException {
  readonly code = "RECURRENCE_INVALID_DATE_RANGE";

  constructor(startDate: string, endDate: string) {
    super(`Recurrence endDate (${endDate}) is before startDate (${startDate})`);
  }
}
