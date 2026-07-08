import type { CategoryEntity, CategoryType } from "./category.entity";

export const CATEGORY_REPOSITORY = Symbol("CATEGORY_REPOSITORY");

export interface CreateCategoryData {
  name: string;
  type: CategoryType;
  color?: string;
  icon?: string | null;
}

export interface UpdateCategoryData {
  name?: string;
  type?: CategoryType;
  color?: string;
  icon?: string | null;
}

export interface ICategoryRepository {
  findAllByHousehold(householdId: string): Promise<CategoryEntity[]>;
  findById(id: string, householdId: string): Promise<CategoryEntity | null>;
  create(householdId: string, data: CreateCategoryData): Promise<CategoryEntity>;
  update(id: string, householdId: string, data: UpdateCategoryData): Promise<CategoryEntity>;
  delete(id: string, householdId: string): Promise<void>;
}
