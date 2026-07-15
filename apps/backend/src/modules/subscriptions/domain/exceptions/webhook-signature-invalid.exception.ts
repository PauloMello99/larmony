import { DomainException } from "../../../../common/exceptions/domain.exception";

export class WebhookSignatureInvalidException extends DomainException {
  readonly code = "WEBHOOK_SIGNATURE_INVALID";

  constructor() {
    super("Assinatura do webhook do Stripe inválida ou ausente.");
  }
}
