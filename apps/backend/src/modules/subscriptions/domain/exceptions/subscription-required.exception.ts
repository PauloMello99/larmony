import { DomainException } from "../../../../common/exceptions/domain.exception";

/**
 * Lançada quando um lar SEM assinatura ativa (locked — nunca assinou, trial
 * expirado, ou cancelado) tenta uma operação de ESCRITA (M16). Mapeada para
 * HTTP 402 (Payment Required); o `code` estável `SUBSCRIPTION_REQUIRED` deixa o
 * frontend levar o usuário ao checkout/trial. Leituras (GET) não passam por aqui.
 */
export class SubscriptionRequiredException extends DomainException {
  readonly code = "SUBSCRIPTION_REQUIRED";

  constructor() {
    super(
      "Este lar não tem uma assinatura ativa. Inicie o teste grátis ou assine para continuar.",
    );
  }
}
