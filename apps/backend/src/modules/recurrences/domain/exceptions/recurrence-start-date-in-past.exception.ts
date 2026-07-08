import { DomainException } from "../../../../common/exceptions/domain.exception";

/** A data de início não pode ser no passado (evita backfill histórico surpresa). */
export class RecurrenceStartDateInPastException extends DomainException {
  readonly code = "RECURRENCE_START_DATE_IN_PAST";

  constructor(startDate: string) {
    super(`Recurrence startDate cannot be in the past: ${startDate}`);
  }
}
