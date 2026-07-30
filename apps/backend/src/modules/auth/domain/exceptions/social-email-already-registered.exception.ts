import { DomainException } from "../../../../common/exceptions/domain.exception";

export class SocialEmailAlreadyRegisteredException extends DomainException {
  readonly code = "SOCIAL_EMAIL_ALREADY_REGISTERED";

  constructor(message = "E-mail already registered with a different login method") {
    super(message);
  }
}
