import { DomainException } from "../../../../common/exceptions/domain.exception";
import type { Capability, ResolvedPlan } from "../entitlements";

/**
 * Lançada quando um lar sem o entitlement necessário tenta acessar uma rota
 * premium. Mapeada para HTTP 402 (Payment Required) em `domain-status.map.ts`
 * — o `code` estável `PREMIUM_REQUIRED` deixa o paywall do frontend (B-6)
 * distinguir "faça upgrade" de "sem permissão" (403).
 */
export class PremiumRequiredException extends DomainException {
  readonly code = "PREMIUM_REQUIRED";

  constructor(capability: Capability, plan: ResolvedPlan) {
    super(
      `O recurso "${capability}" requer um plano premium (plano atual: "${plan}").`,
    );
  }
}
