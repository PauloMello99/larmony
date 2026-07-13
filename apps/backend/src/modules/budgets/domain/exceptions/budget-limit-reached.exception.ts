import { DomainException } from "../../../../common/exceptions/domain.exception";

/**
 * Lançada ao criar uma série de orçamento além de `maxActiveBudgets` (séries
 * com `endedFrom IS NULL`) num lar Free (régua do Free, D-1 — ver adendo
 * ADR-0026). Encerrar uma série existente libera criar outra. Mapeada para
 * 402 em `domain-status.map.ts`.
 */
export class BudgetLimitReachedException extends DomainException {
  readonly code = "BUDGET_LIMIT_REACHED";

  constructor(maxActiveBudgets: number) {
    super(
      `Este lar já tem ${maxActiveBudgets} orçamento(s) ativo(s), o limite do plano Free. Encerre uma série existente ou faça upgrade.`,
    );
  }
}
