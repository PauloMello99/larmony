import { BudgetEntity } from "../../domain/budget.entity";

interface BudgetRow {
  id: string;
  householdId: string;
  categoryId: string;
  month: number;
  year: number;
  amountCents: number;
  createdAt: Date;
  updatedAt: Date;
}

export class BudgetMapper {
  static toDomain(row: BudgetRow): BudgetEntity {
    return BudgetEntity.create({
      id: row.id,
      householdId: row.householdId,
      categoryId: row.categoryId,
      month: row.month,
      year: row.year,
      amountCents: row.amountCents,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }
}
