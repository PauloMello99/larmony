import { Inject, Injectable } from "@nestjs/common";
import { and, desc, eq, gte, lt, sql, type SQL } from "drizzle-orm";
import {
  DRIZZLE,
  DRIZZLE_ADMIN,
  type DrizzleDB,
} from "../../../../database/database.module";
import * as schema from "../../../../database/schema";
import { monthBounds, toISODate, addMonthsISO } from "../../../../common/finance/due-date";
import { splitEqually } from "../../../../common/finance/split";
import type {
  CreateGeneratedData,
  CreateInstallmentData,
  CreateTransactionData,
  ITransactionRepository,
  ListTransactionsFilters,
  TransactionListItem,
  TransactionMemberInput,
  TransactionMemberItem,
  UpdateTransactionData,
} from "../../domain/transaction.repository.interface";
import type { TransactionEntity } from "../../domain/transaction.entity";
import { TransactionNotFoundException } from "../../domain/exceptions/transaction-not-found.exception";
import { InstallmentGroupNotFoundException } from "../../domain/exceptions/installment-group-not-found.exception";
import { TransactionMapper } from "./transaction.mapper";

@Injectable()
export class DrizzleTransactionRepository implements ITransactionRepository {
  constructor(
    // CRUD request-scoped (RLS-enforced).
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    // Geração por recorrência roda no cron (sem request/RLS context) → admin.
    @Inject(DRIZZLE_ADMIN) private readonly admin: DrizzleDB,
  ) {}

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
          installmentGroupId: schema.transactions.installmentGroupId,
          installmentNumber: schema.transactions.installmentNumber,
          installmentCount: schema.transactions.installmentCount,
          recurrenceId: schema.transactions.recurrenceId,
          memberCount: sql<number>`(select count(*)::int from ${schema.transactionMembers} where ${schema.transactionMembers.transactionId} = ${schema.transactions.id})`,
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

  async create(
    householdId: string,
    data: CreateTransactionData,
    members?: TransactionMemberInput[],
  ): Promise<TransactionEntity> {
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

    if (members && members.length > 0) {
      await this.db.insert(schema.transactionMembers).values(
        members.map((m) => ({
          transactionId: row.id,
          userId: m.userId,
          shareAmountCents: m.shareAmountCents,
        })),
      );
    }

    return TransactionMapper.toDomain(row);
  }

  async createInstallment(
    householdId: string,
    data: CreateInstallmentData,
  ): Promise<TransactionEntity[]> {
    const slices = splitEqually(data.totalAmountCents, data.count);

    return this.db.transaction(async (tx) => {
      const [group] = await tx
        .insert(schema.installmentGroups)
        .values({
          householdId,
          description: data.description,
          totalAmountCents: data.totalAmountCents,
        })
        .returning({ id: schema.installmentGroups.id });

      if (!group) throw new Error("Failed to create installment group");

      const rows = await tx
        .insert(schema.transactions)
        .values(
          slices.map((amountCents, i) => ({
            householdId,
            createdBy: data.createdBy,
            personId: data.personId,
            categoryId: data.categoryId ?? null,
            type: data.type,
            amountCents,
            description: data.description,
            date: addMonthsISO(data.firstDate, i),
            notes: data.notes ?? null,
            installmentGroupId: group.id,
            installmentNumber: i + 1,
            installmentCount: data.count,
          })),
        )
        .returning();

      if (data.members && data.members.length > 0) {
        // Rateio igual replicado em cada parcela (shares null).
        await tx.insert(schema.transactionMembers).values(
          rows.flatMap((row) =>
            data.members!.map((m) => ({
              transactionId: row.id,
              userId: m.userId,
              shareAmountCents: m.shareAmountCents,
            })),
          ),
        );
      }

      return rows.map((row) => TransactionMapper.toDomain(row));
    });
  }

  async createGenerated(
    householdId: string,
    data: CreateGeneratedData,
  ): Promise<TransactionEntity> {
    const [row] = await this.admin
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
        recurrenceId: data.recurrenceId,
      })
      .returning();

    if (!row) throw new Error("Failed to create generated transaction");
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

  async replaceMembers(
    id: string,
    householdId: string,
    members: TransactionMemberInput[],
  ): Promise<void> {
    await this.assertTransaction(id, householdId);

    await this.db.transaction(async (tx) => {
      await tx
        .delete(schema.transactionMembers)
        .where(eq(schema.transactionMembers.transactionId, id));

      if (members.length > 0) {
        await tx.insert(schema.transactionMembers).values(
          members.map((m) => ({
            transactionId: id,
            userId: m.userId,
            shareAmountCents: m.shareAmountCents,
          })),
        );
      }
    });
  }

  async findMembers(id: string, householdId: string): Promise<TransactionMemberItem[]> {
    const tx = await this.assertTransaction(id, householdId);

    const rows = await this.db
      .select({
        userId: schema.transactionMembers.userId,
        userName: schema.users.name,
        shareAmountCents: schema.transactionMembers.shareAmountCents,
      })
      .from(schema.transactionMembers)
      .leftJoin(schema.users, eq(schema.users.id, schema.transactionMembers.userId))
      .where(eq(schema.transactionMembers.transactionId, id));

    // Fatia efetiva: específico → o valor; igual (todos null) → split determinístico.
    const allEqual = rows.length > 0 && rows.every((r) => r.shareAmountCents === null);
    const equalSlices = allEqual ? splitEqually(tx.amountCents, rows.length) : [];

    return rows.map((r, i) => ({
      userId: r.userId,
      userName: r.userName,
      shareAmountCents: r.shareAmountCents,
      effectiveShareCents: r.shareAmountCents ?? equalSlices[i] ?? 0,
    }));
  }

  async deleteInstallmentGroup(groupId: string, householdId: string): Promise<void> {
    const rows = await this.db
      .delete(schema.installmentGroups)
      .where(
        and(
          eq(schema.installmentGroups.id, groupId),
          eq(schema.installmentGroups.householdId, householdId),
        ),
      )
      .returning({ id: schema.installmentGroups.id });

    if (rows.length === 0) throw new InstallmentGroupNotFoundException(groupId);
  }

  /** Garante que a transação existe e pertence ao lar (escopo do rateio). */
  private async assertTransaction(
    id: string,
    householdId: string,
  ): Promise<{ amountCents: number }> {
    const [row] = await this.db
      .select({ amountCents: schema.transactions.amountCents })
      .from(schema.transactions)
      .where(
        and(eq(schema.transactions.id, id), eq(schema.transactions.householdId, householdId)),
      )
      .limit(1);

    if (!row) throw new TransactionNotFoundException(id);
    return row;
  }
}
