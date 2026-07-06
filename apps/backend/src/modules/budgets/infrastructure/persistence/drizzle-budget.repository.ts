import { Inject, Injectable } from "@nestjs/common";
import { and, asc, eq, gte, lt, sql } from "drizzle-orm";
import { DRIZZLE, type DrizzleDB } from "../../../../database/database.module";
import * as schema from "../../../../database/schema";
import { monthBounds, toISODate } from "../../../../common/finance/due-date";
import type {
  BudgetListItem,
  CreateBudgetData,
  IBudgetRepository,
} from "../../domain/budget.repository.interface";
import type { BudgetEntity } from "../../domain/budget.entity";
import { BudgetNotFoundException } from "../../domain/exceptions/budget-not-found.exception";
import { BudgetAlreadyExistsException } from "../../domain/exceptions/budget-already-exists.exception";
import { BudgetMapper } from "./budget.mapper";

/** Código Postgres de violação de unique constraint. */
const PG_UNIQUE_VIOLATION = "23505";

@Injectable()
export class DrizzleBudgetRepository implements IBudgetRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async findAllByPeriod(
    householdId: string,
    month: number,
    year: number,
  ): Promise<BudgetListItem[]> {
    const { start, end } = monthBounds(new Date(year, month - 1, 1));

    // Spending derivado em runtime: join correlacionado budgets→transactions por
    // categoria+household dentro do range do mês, somando apenas despesas.
    return this.db
      .select({
        id: schema.budgets.id,
        householdId: schema.budgets.householdId,
        categoryId: schema.budgets.categoryId,
        categoryName: schema.categories.name,
        categoryColor: schema.categories.color,
        categoryIcon: schema.categories.icon,
        month: schema.budgets.month,
        year: schema.budgets.year,
        limitCents: schema.budgets.amountCents,
        spentCents: sql<number>`coalesce(sum(case when ${schema.transactions.type} = 'expense' then ${schema.transactions.amountCents} else 0 end), 0)::int`,
        createdAt: schema.budgets.createdAt,
        updatedAt: schema.budgets.updatedAt,
      })
      .from(schema.budgets)
      .innerJoin(schema.categories, eq(schema.categories.id, schema.budgets.categoryId))
      .leftJoin(
        schema.transactions,
        and(
          eq(schema.transactions.categoryId, schema.budgets.categoryId),
          eq(schema.transactions.householdId, schema.budgets.householdId),
          gte(schema.transactions.date, toISODate(start)),
          lt(schema.transactions.date, toISODate(end)),
        ),
      )
      .where(
        and(
          eq(schema.budgets.householdId, householdId),
          eq(schema.budgets.month, month),
          eq(schema.budgets.year, year),
        ),
      )
      .groupBy(
        schema.budgets.id,
        schema.categories.name,
        schema.categories.color,
        schema.categories.icon,
      )
      .orderBy(asc(schema.categories.name));
  }

  async create(householdId: string, data: CreateBudgetData): Promise<BudgetEntity> {
    try {
      const [row] = await this.db
        .insert(schema.budgets)
        .values({
          householdId,
          categoryId: data.categoryId,
          month: data.month,
          year: data.year,
          amountCents: data.amountCents,
        })
        .returning();

      if (!row) throw new Error("Failed to create budget");
      return BudgetMapper.toDomain(row);
    } catch (err) {
      if (isUniqueViolation(err)) throw new BudgetAlreadyExistsException();
      throw err;
    }
  }

  async updateAmount(
    id: string,
    householdId: string,
    amountCents: number,
  ): Promise<BudgetEntity> {
    const [row] = await this.db
      .update(schema.budgets)
      .set({ amountCents, updatedAt: new Date() })
      .where(and(eq(schema.budgets.id, id), eq(schema.budgets.householdId, householdId)))
      .returning();

    if (!row) throw new BudgetNotFoundException(id);
    return BudgetMapper.toDomain(row);
  }

  async delete(id: string, householdId: string): Promise<void> {
    const rows = await this.db
      .delete(schema.budgets)
      .where(and(eq(schema.budgets.id, id), eq(schema.budgets.householdId, householdId)))
      .returning({ id: schema.budgets.id });

    if (rows.length === 0) throw new BudgetNotFoundException(id);
  }
}

/** O Drizzle embrulha o erro do pg — o `code` 23505 pode estar no erro ou em `.cause`. */
function isUniqueViolation(err: unknown): boolean {
  const hasCode = (e: unknown): boolean =>
    typeof e === "object" &&
    e !== null &&
    "code" in e &&
    (e as { code?: string }).code === PG_UNIQUE_VIOLATION;

  if (hasCode(err)) return true;
  if (typeof err === "object" && err !== null && "cause" in err) {
    return hasCode((err as { cause?: unknown }).cause);
  }
  return false;
}
