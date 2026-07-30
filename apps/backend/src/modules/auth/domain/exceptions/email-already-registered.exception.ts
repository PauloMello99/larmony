import { DomainException } from "../../../../common/exceptions/domain.exception";

export class EmailAlreadyRegisteredException extends DomainException {
  readonly code = "EMAIL_ALREADY_REGISTERED";

  constructor(message = "E-mail already registered") {
    super(message);
  }
}
