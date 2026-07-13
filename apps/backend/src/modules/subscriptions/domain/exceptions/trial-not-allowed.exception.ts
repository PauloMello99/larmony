import { DomainException } from "../../../../common/exceptions/domain.exception";
import type { SubscriptionPlan } from "../subscription.entity";

/**
 * Trial administrativo só é concedível a um lar Free (e revogável de um lar em
 * trial) — H-3. Conceder sobre comp/standard, ou revogar o que não é trial,
 * cai aqui. Mapeada para 422.
 */
export class TrialNotAllowedException extends DomainException {
  readonly code = "TRIAL_NOT_ALLOWED";

  constructor(operation: "grant" | "revoke", currentType: SubscriptionPlan) {
    super(
      operation === "grant"
        ? `Trial só pode ser concedido a um lar no plano gratuito (plano atual: "${currentType}").`
        : `O lar não está em trial (plano atual: "${currentType}").`,
    );
  }
}
