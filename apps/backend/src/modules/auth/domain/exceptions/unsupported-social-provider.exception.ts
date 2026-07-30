import { DomainException } from "../../../../common/exceptions/domain.exception";

export class UnsupportedSocialProviderException extends DomainException {
  readonly code = "SOCIAL_PROVIDER_UNSUPPORTED";

  constructor(message = "Unsupported social login provider") {
    super(message);
  }
}
