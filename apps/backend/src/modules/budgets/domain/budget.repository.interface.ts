import type { BudgetEntity } from "./budget.entity";

export const BUDGET_REPOSITORY = Symbol("BUDGET_REPOSITORY");

/**
 * Item de listagem — categoria resolvida via JOIN + spending derivado das
 * transações + limite resolvido on-read a partir da versão vigente no
 * período (M10). `isEditable`/`isProjected` são atribuídos pelo use-case
 * (comparação de período, não derivados por linha) — ver `list-budgets.use-case`.
 */
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
  isEditable: boolean;
  isProjected: boolean;
}

export interface CreateBudgetData {
  categoryId: string;
  amountCents: number;
}

export interface IBudgetRepository {
  /**
   * Séries com limite resolvido para o período (mês/ano) + spending derivado.
   * Só entram séries que já tinham versão vigente naquele período e que
   * ainda não estavam encerradas (`endedFrom`) antes dele.
   */
  findAllByPeriod(
    householdId: string,
    month: number,
    year: number,
  ): Promise<Omit<BudgetListItem, "isEditable" | "isProjected">[]>;
  /** Cria a série + sua primeira versão, ancorada no mês corrente. */
  create(householdId: string, data: CreateBudgetData): Promise<BudgetEntity>;
  /**
   * Upsert da versão do mês corrente na série aberta (`ON CONFLICT
   * (budget_id, effective_from) DO UPDATE`) — nunca altera uma versão
   * passada. Lança `BudgetNotFoundException` se a série não existe;
   * `BudgetPeriodNotEditableException` se existe mas está encerrada.
   */
  upsertCurrentVersion(
    id: string,
    householdId: string,
    amountCents: number,
  ): Promise<BudgetEntity>;
  /**
   * Encerra a série a partir do mês corrente (`endedFrom`) — nunca hard
   * delete. Lança `BudgetNotFoundException` se não existe uma série ABERTA
   * com esse id.
   */
  endSeries(id: string, householdId: string): Promise<void>;
}
