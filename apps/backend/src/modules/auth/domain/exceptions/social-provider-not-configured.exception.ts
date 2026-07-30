import { DomainException } from "../../../../common/exceptions/domain.exception";

export class SocialProviderNotConfiguredException extends DomainException {
  readonly code = "SOCIAL_PROVIDER_NOT_CONFIGURED";

  constructor(message = "Social login provider is not configured") {
    super(message);
  }
}
