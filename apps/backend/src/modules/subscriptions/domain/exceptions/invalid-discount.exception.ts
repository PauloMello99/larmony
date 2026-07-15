import { DomainException } from "../../../../common/exceptions/domain.exception";

/**
 * Input de desconto inválido (B-7): deve conter exatamente um de
 * `percent`/`amountCents`; percent em 1..100; `repeating` exige
 * `durationInMonths`. Mapeada para 422.
 */
export class InvalidDiscountException extends DomainException {
  readonly code = "INVALID_DISCOUNT";

  constructor(message: string) {
    super(message);
  }
}
