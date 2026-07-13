import { DomainException } from "../../../../common/exceptions/domain.exception";

/**
 * Lançada ao tentar criar um lar quando o usuário já é OWNER de
 * `maxHouseholdsOwned` lares e nenhum deles é premium/custom (régua do Free,
 * D-1 — ver adendo ADR-0026). Fazer upgrade de qualquer lar já possuído libera
 * a criação. Mapeada para 402 em `domain-status.map.ts`, mesmo padrão de
 * `PremiumRequiredException` — o `code` estável distingue "faça upgrade" de
 * outros 4xx no frontend (`translateApiError`).
 */
export class HouseholdLimitReachedException extends DomainException {
  readonly code = "HOUSEHOLD_LIMIT_REACHED";

  constructor(maxHouseholdsOwned: number) {
    super(
      `Você atingiu o limite de ${maxHouseholdsOwned} lar(es) no plano Free. Faça upgrade de um lar existente para criar outro.`,
    );
  }
}
