import { DomainException } from "../../../../common/exceptions/domain.exception";

export class StripeNotConfiguredException extends DomainException {
  readonly code = "STRIPE_NOT_CONFIGURED";

  constructor() {
    super("Stripe não está configurado neste ambiente (STRIPE_SECRET_KEY ausente).");
  }
}
