import { DomainException } from "../../../../common/exceptions/domain.exception";

/**
 * Lançada ao criar uma meta além de `maxActiveGoals` num lar Free (régua do
 * Free, D-1 — ver adendo ADR-0026). Metas não têm conceito de "concluída"
 * hoje, então o limite é a contagem total do lar. Mapeada para 402 em
 * `domain-status.map.ts`.
 */
export class GoalLimitReachedException extends DomainException {
  readonly code = "GOAL_LIMIT_REACHED";

  constructor(maxActiveGoals: number) {
    super(
      `Este lar já tem ${maxActiveGoals} meta(s), o limite do plano Free. Faça upgrade para criar mais.`,
    );
  }
}
