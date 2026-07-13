import { BudgetEntity } from "../../domain/budget.entity";

interface BudgetRow {
  id: string;
  householdId: string;
  categoryId: string;
  endedFrom: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export class BudgetMapper {
  static toDomain(row: BudgetRow): BudgetEntity {
    return BudgetEntity.create({
      id: row.id,
      householdId: row.householdId,
      categoryId: row.categoryId,
      endedFrom: row.endedFrom,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }
}
