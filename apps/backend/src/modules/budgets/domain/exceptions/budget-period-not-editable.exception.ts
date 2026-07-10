import { DomainException } from "../../../../common/exceptions/domain.exception";

export class BudgetPeriodNotEditableException extends DomainException {
  readonly code = "BUDGET_PERIOD_NOT_EDITABLE";

  constructor(budgetId: string) {
    super(`Orçamento ${budgetId} pertence a um período encerrado e não pode ser editado.`);
  }
}
