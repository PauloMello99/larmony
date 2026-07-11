import { DomainException } from "../../../../common/exceptions/domain.exception";

export class HouseholdNotFoundException extends DomainException {
  readonly code = "ORGANIZATION_NOT_FOUND";

  constructor(householdId: string) {
    super(`Household not found: ${householdId}`);
  }
}
