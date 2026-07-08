import { Inject, Injectable } from "@nestjs/common";
import { and, asc, eq } from "drizzle-orm";
import { DRIZZLE, type DrizzleDB } from "../../../../database/database.module";
import * as schema from "../../../../database/schema";
import type {
  CreateCategoryData,
  ICategoryRepository,
  UpdateCategoryData,
} from "../../domain/category.repository.interface";
import type { CategoryEntity } from "../../domain/category.entity";
import { CategoryNotFoundException } from "../../domain/exceptions/category-not-found.exception";
import { CategoryMapper } from "./category.mapper";

@Injectable()
export class DrizzleCategoryRepository implements ICategoryRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async findAllByHousehold(householdId: string): Promise<CategoryEntity[]> {
    const rows = await this.db
      .select()
      .from(schema.categories)
      .where(eq(schema.categories.householdId, householdId))
      .orderBy(asc(schema.categories.name));

    return rows.map(CategoryMapper.toDomain);
  }

  async findById(id: string, householdId: string): Promise<CategoryEntity | null> {
    const [row] = await this.db
      .select()
      .from(schema.categories)
      .where(and(eq(schema.categories.id, id), eq(schema.categories.householdId, householdId)))
      .limit(1);

    return row ? CategoryMapper.toDomain(row) : null;
  }

  async create(householdId: string, data: CreateCategoryData): Promise<CategoryEntity> {
    const [row] = await this.db
      .insert(schema.categories)
      .values({
        householdId,
        name: data.name,
        type: data.type,
        color: data.color,
        icon: data.icon,
        isDefault: false,
      })
      .returning();

    if (!row) throw new Error("Failed to create category");
    return CategoryMapper.toDomain(row);
  }

  async update(
    id: string,
    householdId: string,
    data: UpdateCategoryData,
  ): Promise<CategoryEntity> {
    const [row] = await this.db
      .update(schema.categories)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(schema.categories.id, id), eq(schema.categories.householdId, householdId)))
      .returning();

    if (!row) throw new CategoryNotFoundException(id);
    return CategoryMapper.toDomain(row);
  }

  async delete(id: string, householdId: string): Promise<void> {
    const rows = await this.db
      .delete(schema.categories)
      .where(and(eq(schema.categories.id, id), eq(schema.categories.householdId, householdId)))
      .returning({ id: schema.categories.id });

    if (rows.length === 0) throw new CategoryNotFoundException(id);
  }
}
