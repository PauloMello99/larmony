import { DomainException } from "../../../../common/exceptions/domain.exception";

/**
 * Tentativa de aplicar/remover desconto num lar sem assinatura Stripe ativa
 * (B-7). O desconto sempre passa pela API do Stripe (ADR-0026 §3), então não
 * faz sentido sem uma subscription. Mapeada para 422.
 */
export class SubscriptionNotStripeLinkedException extends DomainException {
  readonly code = "SUBSCRIPTION_NOT_STRIPE_LINKED";

  constructor() {
    super(
      "O lar não tem uma assinatura Stripe ativa — não é possível aplicar desconto.",
    );
  }
}
