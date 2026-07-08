import { CategoryEntity, type CategoryType } from "../../domain/category.entity";

interface CategoryRow {
  id: string;
  householdId: string;
  name: string;
  type: string;
  color: string;
  icon: string | null;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class CategoryMapper {
  static toDomain(row: CategoryRow): CategoryEntity {
    return CategoryEntity.create({
      id: row.id,
      householdId: row.householdId,
      name: row.name,
      type: row.type as CategoryType,
      color: row.color,
      icon: row.icon,
      isDefault: row.isDefault,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }
}
