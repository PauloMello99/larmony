import { DomainException } from "../../../../common/exceptions/domain.exception";

export class BudgetAlreadyExistsException extends DomainException {
  readonly code = "BUDGET_ALREADY_EXISTS";

  constructor() {
    super("Já existe um orçamento para esta categoria neste mês.");
  }
}
