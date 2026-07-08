import { DomainException } from "../../../../common/exceptions/domain.exception";

export class TransactionSplitInvalidException extends DomainException {
  readonly code = "TRANSACTION_SPLIT_INVALID";

  constructor(message = "As fatias do rateio devem somar exatamente o valor da transação") {
    super(message);
  }
}
