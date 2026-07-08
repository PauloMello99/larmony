import { DomainException } from "../../../../common/exceptions/domain.exception";

export class InstallmentGroupNotFoundException extends DomainException {
  readonly code = "INSTALLMENT_GROUP_NOT_FOUND";

  constructor(groupId: string) {
    super(`Installment group not found: ${groupId}`);
  }
}
