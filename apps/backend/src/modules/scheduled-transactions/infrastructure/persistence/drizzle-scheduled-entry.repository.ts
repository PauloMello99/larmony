import { Inject, Injectable } from "@nestjs/common";
import { and, eq, isNotNull, lte } from "drizzle-orm";
import { DRIZZLE, DRIZZLE_ADMIN, type DrizzleDB } from "../../../../database/database.module";
import * as schema from "../../../../database/schema";
import { daysBetween, nextManualOccurrence, toISODate } from "../../../../common/finance/due-date";
import {
  ScheduledEntryEntity,
  type ScheduledEntryFrequency,
  type ScheduledEntryPostingMode,
} from "../../domain/scheduled-entry.entity";
import type {
  CreateScheduledEntryData,
  DueScheduledEntry,
  EntryForLaunch,
  IScheduledEntryRepository,
  ScheduledEntryListItem,
  UpdateScheduledEntryData,
} from "../../domain/scheduled-entry.repository.interface";
import { ScheduledEntryNotFoundException } from "../../domain/exceptions/scheduled-entry-not-found.exception";
import type { TransactionType } from "../../../transactions/domain/transaction.entity";

interface ListRow {
  id: string;
  householdId: string;
  postingMode: ScheduledEntryPostingMode;
  createdBy: string;
  personId: string | null;
  personName: string | null;
  categoryId: string | null;
  categoryName: string | null;
  categoryColor: string | null;
  categoryIcon: string | null;
  type: TransactionType;
  amountCents: number;
  description: string;
  frequency: ScheduledEntryFrequency;
  interval: number;
  startDate: string;
  endDate: string | null;
  nextRunDate: string | null;
  isActive: boolean;
  notes: string | null;
  reminderDaysBefore: number | null;
}

@Injectable()
export class DrizzleScheduledEntryRepository implements IScheduledEntryRepository {
  constructor(
    // CRUD request-scoped (RLS-enforced; membership já garantida pelo guard).
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    // Engine + lembrete rodam no cron (sem request/RLS context) → conexão admin.
    @Inject(DRIZZLE_ADMIN) private readonly admin: DrizzleDB,
  ) {}

  private static readonly listColumns = {
    id: schema.scheduledTransactionEntries.id,
    householdId: schema.scheduledTransactionEntries.householdId,
    postingMode: schema.scheduledTransactionEntries.postingMode,
    createdBy: schema.scheduledTransactionEntries.createdBy,
    personId: schema.scheduledTransactionEntries.personId,
    personName: schema.users.name,
    categoryId: schema.scheduledTransactionEntries.categoryId,
    categoryName: schema.categories.name,
    categoryColor: schema.categories.color,
    categoryIcon: schema.categories.icon,
    type: schema.scheduledTransactionEntries.type,
    amountCents: schema.scheduledTransactionEntries.amountCents,
    description: schema.scheduledTransactionEntries.description,
    frequency: schema.scheduledTransactionEntries.frequency,
    interval: schema.scheduledTransactionEntries.interval,
    startDate: schema.scheduledTransactionEntries.startDate,
    endDate: schema.scheduledTransactionEntries.endDate,
    nextRunDate: schema.scheduledTransactionEntries.nextRunDate,
    isActive: schema.scheduledTransactionEntries.isActive,
    notes: schema.scheduledTransactionEntries.notes,
    reminderDaysBefore: schema.scheduledTransactionEntries.reminderDaysBefore,
  } as const;

  /** Hidrata a linha crua: modo manual ganha dueDate/daysUntilDue calculados
   *  estatelessmente; modo auto usa o cursor nextRunDate já persistido. */
  private hydrate(row: ListRow, now: Date): ScheduledEntryListItem {
    if (row.postingMode === "manual") {
      const due = nextManualOccurrence(row.startDate, now, row.frequency, row.interval);
      return { ...row, dueDate: toISODate(due), daysUntilDue: daysBetween(now, due) };
    }
    return { ...row, dueDate: null, daysUntilDue: null };
  }

  async findAllByHousehold(householdId: string, now: Date): Promise<ScheduledEntryListItem[]> {
    const rows = await this.db
      .select(DrizzleScheduledEntryRepository.listColumns)
      .from(schema.scheduledTransactionEntries)
      .leftJoin(
        schema.categories,
        eq(schema.categories.id, schema.scheduledTransactionEntries.categoryId),
      )
      .leftJoin(schema.users, eq(schema.users.id, schema.scheduledTransactionEntries.personId))
      .where(eq(schema.scheduledTransactionEntries.householdId, householdId));

    return rows
      .map((row) => this.hydrate(row, now))
      .sort((a, b) => {
        if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
        // auto usa nextRunDate (cursor), manual usa dueDate (calculado) —
        // ambos ISO yyyy-MM-dd, comparáveis lexicograficamente.
        const aDate = a.nextRunDate ?? a.dueDate ?? "";
        const bDate = b.nextRunDate ?? b.dueDate ?? "";
        return aDate.localeCompare(bDate);
      });
  }

  async findById(id: string, householdId: string): Promise<ScheduledEntryListItem | null> {
    const [row] = await this.db
      .select(DrizzleScheduledEntryRepository.listColumns)
      .from(schema.scheduledTransactionEntries)
      .leftJoin(
        schema.categories,
        eq(schema.categories.id, schema.scheduledTransactionEntries.categoryId),
      )
      .leftJoin(schema.users, eq(schema.users.id, schema.scheduledTransactionEntries.personId))
      .where(
        and(
          eq(schema.scheduledTransactionEntries.id, id),
          eq(schema.scheduledTransactionEntries.householdId, householdId),
        ),
      )
      .limit(1);

    return row ? this.hydrate(row, new Date()) : null;
  }

  async findForLaunch(id: string, householdId: string): Promise<EntryForLaunch | null> {
    const [row] = await this.db
      .select({
        id: schema.scheduledTransactionEntries.id,
        postingMode: schema.scheduledTransactionEntries.postingMode,
        description: schema.scheduledTransactionEntries.description,
        amountCents: schema.scheduledTransactionEntries.amountCents,
        categoryId: schema.scheduledTransactionEntries.categoryId,
        type: schema.scheduledTransactionEntries.type,
      })
      .from(schema.scheduledTransactionEntries)
      .where(
        and(
          eq(schema.scheduledTransactionEntries.id, id),
          eq(schema.scheduledTransactionEntries.householdId, householdId),
        ),
      )
      .limit(1);

    return row ?? null;
  }

  async create(
    householdId: string,
    data: CreateScheduledEntryData,
  ): Promise<ScheduledEntryListItem> {
    const [row] = await this.db
      .insert(schema.scheduledTransactionEntries)
      .values({
        householdId,
        postingMode: data.postingMode,
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
        reminderDaysBefore: data.reminderDaysBefore ?? null,
        notes: data.notes ?? null,
      })
      .returning({ id: schema.scheduledTransactionEntries.id });

    if (!row) throw new Error("Failed to create scheduled entry");
    return this.getOne(row.id, householdId);
  }

  async update(
    id: string,
    householdId: string,
    data: UpdateScheduledEntryData,
  ): Promise<ScheduledEntryListItem> {
    const rows = await this.db
      .update(schema.scheduledTransactionEntries)
      .set({ ...data, updatedAt: new Date() })
      .where(
        and(
          eq(schema.scheduledTransactionEntries.id, id),
          eq(schema.scheduledTransactionEntries.householdId, householdId),
        ),
      )
      .returning({ id: schema.scheduledTransactionEntries.id });

    if (rows.length === 0) throw new ScheduledEntryNotFoundException(id);
    return this.getOne(id, householdId);
  }

  async delete(id: string, householdId: string): Promise<void> {
    const rows = await this.db
      .delete(schema.scheduledTransactionEntries)
      .where(
        and(
          eq(schema.scheduledTransactionEntries.id, id),
          eq(schema.scheduledTransactionEntries.householdId, householdId),
        ),
      )
      .returning({ id: schema.scheduledTransactionEntries.id });

    if (rows.length === 0) throw new ScheduledEntryNotFoundException(id);
  }

  // ─── Engine (admin, modo auto) ───

  async findDue(today: string): Promise<DueScheduledEntry[]> {
    const rows = await this.admin
      .select({
        id: schema.scheduledTransactionEntries.id,
        householdId: schema.scheduledTransactionEntries.householdId,
        createdBy: schema.scheduledTransactionEntries.createdBy,
        personId: schema.scheduledTransactionEntries.personId,
        categoryId: schema.scheduledTransactionEntries.categoryId,
        type: schema.scheduledTransactionEntries.type,
        amountCents: schema.scheduledTransactionEntries.amountCents,
        description: schema.scheduledTransactionEntries.description,
        frequency: schema.scheduledTransactionEntries.frequency,
        interval: schema.scheduledTransactionEntries.interval,
        endDate: schema.scheduledTransactionEntries.endDate,
        nextRunDate: schema.scheduledTransactionEntries.nextRunDate,
      })
      .from(schema.scheduledTransactionEntries)
      .where(
        and(
          eq(schema.scheduledTransactionEntries.postingMode, "auto"),
          eq(schema.scheduledTransactionEntries.isActive, true),
          isNotNull(schema.scheduledTransactionEntries.nextRunDate),
          lte(schema.scheduledTransactionEntries.nextRunDate, today),
        ),
      );

    // nextRunDate é garantidamente non-null aqui: filtrado por isNotNull() e
    // reforçado pelo CHECK do banco (posting_mode='auto' ⟺ next_run_date IS NOT NULL).
    return rows.map((r) => ({ ...r, nextRunDate: r.nextRunDate as string }));
  }

  async advanceNextRun(id: string, nextRunDate: string): Promise<void> {
    await this.admin
      .update(schema.scheduledTransactionEntries)
      .set({ nextRunDate, updatedAt: new Date() })
      .where(eq(schema.scheduledTransactionEntries.id, id));
  }

  async deactivate(id: string): Promise<void> {
    await this.admin
      .update(schema.scheduledTransactionEntries)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(schema.scheduledTransactionEntries.id, id));
  }

  // ─── Lembrete (admin, modo manual) ───

  async findActiveWithReminder(): Promise<ScheduledEntryEntity[]> {
    const rows = await this.admin
      .select({
        id: schema.scheduledTransactionEntries.id,
        householdId: schema.scheduledTransactionEntries.householdId,
        householdSlug: schema.households.slug,
        description: schema.scheduledTransactionEntries.description,
        amountCents: schema.scheduledTransactionEntries.amountCents,
        frequency: schema.scheduledTransactionEntries.frequency,
        interval: schema.scheduledTransactionEntries.interval,
        startDate: schema.scheduledTransactionEntries.startDate,
        isActive: schema.scheduledTransactionEntries.isActive,
        reminderDaysBefore: schema.scheduledTransactionEntries.reminderDaysBefore,
        reminderLastSentAt: schema.scheduledTransactionEntries.reminderLastSentAt,
      })
      .from(schema.scheduledTransactionEntries)
      .innerJoin(
        schema.households,
        eq(schema.households.id, schema.scheduledTransactionEntries.householdId),
      )
      .where(
        and(
          eq(schema.scheduledTransactionEntries.postingMode, "manual"),
          eq(schema.scheduledTransactionEntries.isActive, true),
          isNotNull(schema.scheduledTransactionEntries.reminderDaysBefore),
        ),
      );

    return rows.map((r) => ScheduledEntryEntity.create(r));
  }

  async markReminderSent(id: string, at: Date): Promise<void> {
    await this.admin
      .update(schema.scheduledTransactionEntries)
      .set({ reminderLastSentAt: at, updatedAt: at })
      .where(eq(schema.scheduledTransactionEntries.id, id));
  }

  async findHouseholdMemberUserIds(householdId: string): Promise<string[]> {
    const rows = await this.admin
      .select({ userId: schema.householdMemberships.userId })
      .from(schema.householdMemberships)
      .where(
        and(
          eq(schema.householdMemberships.householdId, householdId),
          eq(schema.householdMemberships.enabled, true),
        ),
      );
    return rows.map((r) => r.userId);
  }

  private async getOne(id: string, householdId: string): Promise<ScheduledEntryListItem> {
    const item = await this.findById(id, householdId);
    if (!item) throw new ScheduledEntryNotFoundException(id);
    return item;
  }
}
