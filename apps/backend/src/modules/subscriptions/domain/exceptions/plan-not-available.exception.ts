import { DomainException } from "../../../../common/exceptions/domain.exception";

export class PlanNotAvailableException extends DomainException {
  readonly code = "PLAN_NOT_AVAILABLE";

  constructor(planKey: string) {
    super(
      `Plano "${planKey}" ainda não foi sincronizado com o Stripe — tente novamente em instantes.`,
    );
  }
}
