import { Inject, Injectable } from "@nestjs/common";
import { currentMonthYear, currentPeriodStart, periodStart } from "../../../../common/finance/due-date";
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

  async execute(householdId: string, month?: number, year?: number): Promise<BudgetListItem[]> {
    // "Mês corrente" é resolvido no fuso do lar (M12) — mesma âncora usada por
    // create/edit no repositório, para o gate isEditable nunca divergir.
    const timezone = await this.budgetRepo.findTimezone(householdId);
    const current = currentMonthYear(timezone);
    const resolvedMonth = month ?? current.month;
    const resolvedYear = year ?? current.year;

    const items = await this.budgetRepo.findAllByPeriod(householdId, resolvedMonth, resolvedYear);

    // isEditable/isProjected são propriedades do PERÍODO consultado, não da
    // linha — nunca há versão futura (sem scheduling no v1), então qualquer
    // período à frente do mês corrente é sempre projeção do limite vigente.
    const requestedPeriodStart = periodStart(resolvedMonth, resolvedYear);
    const currentStart = currentPeriodStart(timezone);
    const isEditable = requestedPeriodStart === currentStart;
    const isProjected = requestedPeriodStart > currentStart;

    return items.map((item) => ({ ...item, isEditable, isProjected }));
  }
}
