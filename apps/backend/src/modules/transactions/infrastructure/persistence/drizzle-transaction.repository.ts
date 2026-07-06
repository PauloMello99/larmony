import { Inject, Injectable } from "@nestjs/common";
import { and, desc, eq, gte, lt, sql, type SQL } from "drizzle-orm";
import { DRIZZLE, type DrizzleDB } from "../../../../database/database.module";
import * as schema from "../../../../database/schema";
import { monthBounds, toISODate } from "../../../../common/finance/due-date";
import type {
  CreateTransactionData,
  ITransactionRepository,
  ListTransactionsFilters,
  TransactionListItem,
  UpdateTransactionData,
} from "../../domain/transaction.repository.interface";
import type { TransactionEntity } from "../../domain/transaction.entity";
import { TransactionNotFoundException } from "../../domain/exceptions/transaction-not-found.exception";
import { TransactionMapper } from "./transaction.mapper";

@Injectable()
export class DrizzleTransactionRepository implements ITransactionRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async findAllByHousehold(
    householdId: string,
    filters: ListTransactionsFilters,
  ): Promise<{ items: TransactionListItem[]; total: number }> {
    const conditions: SQL[] = [eq(schema.transactions.householdId, householdId)];

    if (filters.type) conditions.push(eq(schema.transactions.type, filters.type));
    if (filters.categoryId) {
      conditions.push(eq(schema.transactions.categoryId, filters.categoryId));
    }
    if (filters.month && filters.year) {
      const { start, end } = monthBounds(new Date(filters.year, filters.month - 1, 1));
      conditions.push(gte(schema.transactions.date, toISODate(start)));
      conditions.push(lt(schema.transactions.date, toISODate(end)));
    }

    const where = and(...conditions);

    const [items, countRows] = await Promise.all([
      this.db
        .select({
          id: schema.transactions.id,
          householdId: schema.transactions.householdId,
          createdBy: schema.transactions.createdBy,
          type: schema.transactions.type,
          amountCents: schema.transactions.amountCents,
          description: schema.transactions.description,
          date: schema.transactions.date,
          notes: schema.transactions.notes,
          categoryId: schema.transactions.categoryId,
          categoryName: schema.categories.name,
          categoryColor: schema.categories.color,
          categoryIcon: schema.categories.icon,
          personId: schema.transactions.personId,
          personName: schema.users.name,
          createdAt: schema.transactions.createdAt,
          updatedAt: schema.transactions.updatedAt,
        })
        .from(schema.transactions)
        .leftJoin(schema.categories, eq(schema.categories.id, schema.transactions.categoryId))
        .leftJoin(schema.users, eq(schema.users.id, schema.transactions.personId))
        .where(where)
        .orderBy(desc(schema.transactions.date), desc(schema.transactions.createdAt))
        .limit(filters.limit)
        .offset(filters.offset),
      this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(schema.transactions)
        .where(where),
    ]);

    return {
      items: items.map((row) => ({
        ...row,
        type: row.type as TransactionListItem["type"],
      })),
      total: countRows[0]?.count ?? 0,
    };
  }

  async findById(id: string, householdId: string): Promise<TransactionEntity | null> {
    const [row] = await this.db
      .select()
      .from(schema.transactions)
      .where(
        and(eq(schema.transactions.id, id), eq(schema.transactions.householdId, householdId)),
      )
      .limit(1);

    return row ? TransactionMapper.toDomain(row) : null;
  }

  async create(householdId: string, data: CreateTransactionData): Promise<TransactionEntity> {
    const [row] = await this.db
      .insert(schema.transactions)
      .values({
        householdId,
        createdBy: data.createdBy,
        personId: data.personId,
        categoryId: data.categoryId ?? null,
        type: data.type,
        amountCents: data.amountCents,
        description: data.description,
        date: data.date,
        notes: data.notes ?? null,
      })
      .returning();

    if (!row) throw new Error("Failed to create transaction");
    return TransactionMapper.toDomain(row);
  }

  async update(
    id: string,
    householdId: string,
    data: UpdateTransactionData,
  ): Promise<TransactionEntity> {
    const [row] = await this.db
      .update(schema.transactions)
      .set({ ...data, updatedAt: new Date() })
      .where(
        and(eq(schema.transactions.id, id), eq(schema.transactions.householdId, householdId)),
      )
      .returning();

    if (!row) throw new TransactionNotFoundException(id);
    return TransactionMapper.toDomain(row);
  }

  async delete(id: string, householdId: string): Promise<void> {
    const rows = await this.db
      .delete(schema.transactions)
      .where(
        and(eq(schema.transactions.id, id), eq(schema.transactions.householdId, householdId)),
      )
      .returning({ id: schema.transactions.id });

    if (rows.length === 0) throw new TransactionNotFoundException(id);
  }
}
