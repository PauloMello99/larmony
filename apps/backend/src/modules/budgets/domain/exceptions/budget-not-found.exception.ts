import { DomainException } from "../../../../common/exceptions/domain.exception";

export class BudgetNotFoundException extends DomainException {
  readonly code = "BUDGET_NOT_FOUND";

  constructor(budgetId: string) {
    super(`Budget not found: ${budgetId}`);
  }
}
