import { DomainException } from "../../../../common/exceptions/domain.exception";

/**
 * Lançar manualmente como transação só vale para entradas `manual` — uma
 * entrada `auto` já é postada pelo engine; permitir o launch manual também
 * criaria uma duplicata.
 */
export class ScheduledEntryNotManualException extends DomainException {
  readonly code = "SCHEDULED_ENTRY_NOT_MANUAL";

  constructor(entryId: string) {
    super(`Scheduled entry is not in manual mode, cannot launch: ${entryId}`);
  }
}
