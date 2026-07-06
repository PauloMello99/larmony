import { DomainException } from "../../../../common/exceptions/domain.exception";

export class BillNotFoundException extends DomainException {
  readonly code = "BILL_NOT_FOUND";

  constructor(billId: string) {
    super(`Bill not found: ${billId}`);
  }
}
