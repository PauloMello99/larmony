import { GoalEntity } from "../../domain/goal.entity";

interface GoalRow {
  id: string;
  householdId: string;
  name: string;
  description: string | null;
  targetAmountCents: number;
  targetDate: string | null;
  color: string;
  createdAt: Date;
  updatedAt: Date;
}

export class GoalMapper {
  static toDomain(row: GoalRow): GoalEntity {
    return GoalEntity.create({
      id: row.id,
      householdId: row.householdId,
      name: row.name,
      description: row.description,
      targetAmountCents: row.targetAmountCents,
      targetDate: row.targetDate,
      color: row.color,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }
}
