import { Inject, Injectable } from "@nestjs/common";
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

  execute(householdId: string, month: number, year: number): Promise<BudgetListItem[]> {
    return this.budgetRepo.findAllByPeriod(householdId, month, year);
  }
}
