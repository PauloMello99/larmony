import { DomainException } from "../../../../common/exceptions/domain.exception";

export class NoStripeCustomerException extends DomainException {
  readonly code = "NO_STRIPE_CUSTOMER";

  constructor(householdId: string) {
    super(
      `Household ${householdId} ainda não tem uma assinatura Stripe — assine antes de gerenciar.`,
    );
  }
}
