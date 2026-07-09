import { DomainException } from "../../../../common/exceptions/domain.exception";

/**
 * A data de início não pode ser no passado — só se aplica ao modo `auto`
 * (evita backfill histórico surpresa do engine). Entradas `manual` não geram
 * nada automaticamente, então uma `startDate` no passado é normal e permitida
 * (ex.: uma conta que já existe há anos, migrada de bills).
 */
export class ScheduledEntryStartDateInPastException extends DomainException {
  readonly code = "SCHEDULED_ENTRY_START_DATE_IN_PAST";

  constructor(startDate: string) {
    super(`Scheduled entry startDate cannot be in the past for auto mode: ${startDate}`);
  }
}
