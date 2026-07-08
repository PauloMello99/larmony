import { Inject, Injectable } from "@nestjs/common";
import { and, asc, desc, eq, lte } from "drizzle-orm";
import {
  DRIZZLE,
  DRIZZLE_ADMIN,
  type DrizzleDB,
} from "../../../../database/database.module";
import * as schema from "../../../../database/schema";
import type {
  CreateRecurrenceData,
  DueRecurrence,
  IRecurrenceRepository,
  RecurrenceListItem,
  UpdateRecurrenceData,
} from "../../domain/recurrence.repository.interface";
import { RecurrenceNotFoundException } from "../../domain/exceptions/recurrence-not-found.exception";

@Injectable()
export class DrizzleRecurrenceRepository implements IRecurrenceRepository {
  constructor(
    // CRUD request-scoped (RLS-enforced; membership já garantida pelo guard).
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    // Engine roda no cron (sem request/RLS context) → conexão admin.
    @Inject(DRIZZLE_ADMIN) private readonly admin: DrizzleDB,
  ) {}

  private static readonly listColumns = {
    id: schema.recurrences.id,
    householdId: schema.recurrences.householdId,
    createdBy: schema.recurrences.createdBy,
    personId: schema.recurrences.personId,
    personName: schema.users.name,
    categoryId: schema.recurrences.categoryId,
    categoryName: schema.categories.name,
    categoryColor: schema.categories.color,
    categoryIcon: schema.categories.icon,
    type: schema.recurrences.type,
    amountCents: schema.recurrences.amountCents,
    description: schema.recurrences.description,
    frequency: schema.recurrences.frequency,
    interval: schema.recurrences.interval,
    startDate: schema.recurrences.startDate,
    endDate: schema.recurrences.endDate,
    nextRunDate: schema.recurrences.nextRunDate,
    isActive: schema.recurrences.isActive,
    notes: schema.recurrences.notes,
  } as const;

  async findAllByHousehold(householdId: string): Promise<RecurrenceListItem[]> {
    return this.db
      .select(DrizzleRecurrenceRepository.listColumns)
      .from(schema.recurrences)
      .leftJoin(schema.categories, eq(schema.categories.id, schema.recurrences.categoryId))
      .leftJoin(schema.users, eq(schema.users.id, schema.recurrences.personId))
      .where(eq(schema.recurrences.householdId, householdId))
      .orderBy(desc(schema.recurrences.isActive), asc(schema.recurrences.nextRunDate));
  }

  async findById(id: string, householdId: string): Promise<RecurrenceListItem | null> {
    const [row] = await this.db
      .select(DrizzleRecurrenceRepository.listColumns)
      .from(schema.recurrences)
      .leftJoin(schema.categories, eq(schema.categories.id, schema.recurrences.categoryId))
      .leftJoin(schema.users, eq(schema.users.id, schema.recurrences.personId))
      .where(
        and(
          eq(schema.recurrences.id, id),
          eq(schema.recurrences.householdId, householdId),
        ),
      )
      .limit(1);

    return row ?? null;
  }

  async create(householdId: string, data: CreateRecurrenceData): Promise<RecurrenceListItem> {
    const [row] = await this.db
      .insert(schema.recurrences)
      .values({
        householdId,
        createdBy: data.createdBy,
        personId: data.personId,
        categoryId: data.categoryId ?? null,
        type: data.type,
        amountCents: data.amountCents,
        description: data.description,
        frequency: data.frequency,
        interval: data.interval,
        startDate: data.startDate,
        endDate: data.endDate ?? null,
        nextRunDate: data.nextRunDate,
        notes: data.notes ?? null,
      })
      .returning({ id: schema.recurrences.id });

    if (!row) throw new Error("Failed to create recurrence");
    return this.getOne(row.id, householdId);
  }

  async update(
    id: string,
    householdId: string,
    data: UpdateRecurrenceData,
  ): Promise<RecurrenceListItem> {
    const rows = await this.db
      .update(schema.recurrences)
      .set({ ...data, updatedAt: new Date() })
      .where(
        and(
          eq(schema.recurrences.id, id),
          eq(schema.recurrences.householdId, householdId),
        ),
      )
      .returning({ id: schema.recurrences.id });

    if (rows.length === 0) throw new RecurrenceNotFoundException(id);
    return this.getOne(id, householdId);
  }

  async delete(id: string, householdId: string): Promise<void> {
    const rows = await this.db
      .delete(schema.recurrences)
      .where(
        and(
          eq(schema.recurrences.id, id),
          eq(schema.recurrences.householdId, householdId),
        ),
      )
      .returning({ id: schema.recurrences.id });

    if (rows.length === 0) throw new RecurrenceNotFoundException(id);
  }

  // ─── Engine (admin) ───

  async findDue(today: string): Promise<DueRecurrence[]> {
    const rows = await this.admin
      .select({
        id: schema.recurrences.id,
        householdId: schema.recurrences.householdId,
        createdBy: schema.recurrences.createdBy,
        personId: schema.recurrences.personId,
        categoryId: schema.recurrences.categoryId,
        type: schema.recurrences.type,
        amountCents: schema.recurrences.amountCents,
        description: schema.recurrences.description,
        frequency: schema.recurrences.frequency,
        interval: schema.recurrences.interval,
        endDate: schema.recurrences.endDate,
        nextRunDate: schema.recurrences.nextRunDate,
      })
      .from(schema.recurrences)
      .where(
        and(
          eq(schema.recurrences.isActive, true),
          lte(schema.recurrences.nextRunDate, today),
        ),
      );

    return rows;
  }

  async advanceNextRun(id: string, nextRunDate: string): Promise<void> {
    await this.admin
      .update(schema.recurrences)
      .set({ nextRunDate, updatedAt: new Date() })
      .where(eq(schema.recurrences.id, id));
  }

  async deactivate(id: string): Promise<void> {
    await this.admin
      .update(schema.recurrences)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(schema.recurrences.id, id));
  }

  private async getOne(id: string, householdId: string): Promise<RecurrenceListItem> {
    const item = await this.findById(id, householdId);
    if (!item) throw new RecurrenceNotFoundException(id);
    return item;
  }
}
