import { DomainException } from "../../../../common/exceptions/domain.exception";

/**
 * Lançada ao convidar um membro além de `maxMembersPerHousehold` (incluindo o
 * dono) num lar Free (régua do Free, D-1 — ver adendo ADR-0026). Conta
 * membros ativos + convites pendentes, para não ser burlado com convites em
 * excesso. Mapeada para 402 em `domain-status.map.ts`.
 */
export class MemberLimitReachedException extends DomainException {
  readonly code = "MEMBER_LIMIT_REACHED";

  constructor(maxMembersPerHousehold: number) {
    super(
      `Este lar já tem ${maxMembersPerHousehold} membro(s), o limite do plano Free. Faça upgrade para convidar mais pessoas.`,
    );
  }
}
