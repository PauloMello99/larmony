import { Inject, Injectable } from "@nestjs/common";
import { currentPeriodStart, periodStart } from "../../../../common/finance/due-date";
import {
  BUDGET_REPOSITORY,
  IBudgetRepository,
  type BudgetListItem,
} from "../../domain/budget.repository.interface";

@Injectable()
export class ListBudgetsUseCase {
  constructor(
    @Inject(BUDGET_REPOSITORY) private readonly budgetRepo: IBudgetRepository,
  ) {}

  async execute(householdId: string, month: number, year: number): Promise<BudgetListItem[]> {
    const items = await this.budgetRepo.findAllByPeriod(householdId, month, year);

    // isEditable/isProjected são propriedades do PERÍODO consultado, não da
    // linha — nunca há versão futura (sem scheduling no v1), então qualquer
    // período à frente do mês corrente é sempre projeção do limite vigente.
    const requestedPeriodStart = periodStart(month, year);
    const current = currentPeriodStart();
    const isEditable = requestedPeriodStart === current;
    const isProjected = requestedPeriodStart > current;

    return items.map((item) => ({ ...item, isEditable, isProjected }));
  }
}
