import type { BudgetEntity } from "./budget.entity";

export const BUDGET_REPOSITORY = Symbol("BUDGET_REPOSITORY");

/** Item de listagem — categoria resolvida via JOIN + spending derivado das transações. */
export interface BudgetListItem {
  id: string;
  householdId: string;
  categoryId: string;
  categoryName: string;
  categoryColor: string;
  categoryIcon: string | null;
  month: number;
  year: number;
  limitCents: number;
  spentCents: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateBudgetData {
  categoryId: string;
  month: number;
  year: number;
  amountCents: number;
}

export interface IBudgetRepository {
  /** Todos os budgets do período (mês/ano) com spending derivado. */
  findAllByPeriod(
    householdId: string,
    month: number,
    year: number,
  ): Promise<BudgetListItem[]>;
  create(householdId: string, data: CreateBudgetData): Promise<BudgetEntity>;
  updateAmount(
    id: string,
    householdId: string,
    amountCents: number,
  ): Promise<BudgetEntity>;
  delete(id: string, householdId: string): Promise<void>;
}
