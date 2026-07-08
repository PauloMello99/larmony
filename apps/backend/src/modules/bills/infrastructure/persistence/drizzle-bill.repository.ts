import { Inject, Injectable } from "@nestjs/common";
import { and, eq, isNotNull } from "drizzle-orm";
import { DRIZZLE, DRIZZLE_ADMIN, type DrizzleDB } from "../../../../database/database.module";
import * as schema from "../../../../database/schema";
import { nextDueDate, daysBetween, toISODate } from "../../../../common/finance/due-date";
import { BillEntity } from "../../domain/bill.entity";
import type {
  BillForLaunch,
  BillListItem,
  CreateBillData,
  IBillRepository,
  UpdateBillData,
} from "../../domain/bill.repository.interface";
import { BillNotFoundException } from "../../domain/exceptions/bill-not-found.exception";

@Injectable()
export class DrizzleBillRepository implements IBillRepository {
  constructor(
    // CRUD roda dentro de request context → RLS-enforced (membership já
    // verificada pelo HouseholdMembershipGuard no controller).
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    // Job de cron roda fora de request/RLS context → conexão admin, escopo
    // garantido pelas próprias queries (não há input de usuário aqui).
    @Inject(DRIZZLE_ADMIN) private readonly admin: DrizzleDB,
  ) {}

  async findActiveWithReminder(): Promise<BillEntity[]> {
    const rows = await this.admin
      .select({
        id: schema.bills.id,
        householdId: schema.bills.householdId,
        householdSlug: schema.households.slug,
        name: schema.bills.name,
        amountCents: schema.bills.amountCents,
        dueDay: schema.bills.dueDay,
        isActive: schema.bills.isActive,
        reminderDaysBefore: schema.bills.reminderDaysBefore,
        reminderLastSentAt: schema.bills.reminderLastSentAt,
      })
      .from(schema.bills)
      .innerJoin(schema.households, eq(schema.households.id, schema.bills.householdId))
      .where(
        and(
          eq(schema.bills.isActive, true),
          isNotNull(schema.bills.reminderDaysBefore),
        ),
      );

    return rows.map((r) => BillEntity.create(r));
  }

  async markReminderSent(billId: string, at: Date): Promise<void> {
    await this.admin
      .update(schema.bills)
      .set({ reminderLastSentAt: at, updatedAt: at })
      .where(eq(schema.bills.id, billId));
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

  async findAllByHousehold(householdId: string, now: Date): Promise<BillListItem[]> {
    const rows = await this.db
      .select({
        id: schema.bills.id,
        householdId: schema.bills.householdId,
        categoryId: schema.bills.categoryId,
        categoryName: schema.categories.name,
        categoryColor: schema.categories.color,
        categoryIcon: schema.categories.icon,
        name: schema.bills.name,
        amountCents: schema.bills.amountCents,
        dueDay: schema.bills.dueDay,
        isActive: schema.bills.isActive,
        notes: schema.bills.notes,
        reminderDaysBefore: schema.bills.reminderDaysBefore,
      })
      .from(schema.bills)
      .leftJoin(schema.categories, eq(schema.categories.id, schema.bills.categoryId))
      .where(eq(schema.bills.householdId, householdId));

    return rows
      .map((row) => {
        const due = nextDueDate(row.dueDay, now);
        return {
          ...row,
          dueDate: toISODate(due),
          daysUntilDue: daysBetween(now, due),
        };
      })
      .sort((a, b) => a.daysUntilDue - b.daysUntilDue);
  }

  async findForLaunch(id: string, householdId: string): Promise<BillForLaunch | null> {
    const [row] = await this.db
      .select({
        id: schema.bills.id,
        name: schema.bills.name,
        amountCents: schema.bills.amountCents,
        categoryId: schema.bills.categoryId,
      })
      .from(schema.bills)
      .where(and(eq(schema.bills.id, id), eq(schema.bills.householdId, householdId)))
      .limit(1);

    return row ?? null;
  }

  async create(householdId: string, data: CreateBillData): Promise<BillListItem> {
    const [row] = await this.db
      .insert(schema.bills)
      .values({
        householdId,
        name: data.name,
        amountCents: data.amountCents,
        dueDay: data.dueDay,
        categoryId: data.categoryId ?? null,
        isActive: data.isActive ?? true,
        reminderDaysBefore: data.reminderDaysBefore ?? null,
        notes: data.notes ?? null,
      })
      .returning({ id: schema.bills.id });

    if (!row) throw new Error("Failed to create bill");
    return this.getOne(row.id, householdId);
  }

  async update(id: string, householdId: string, data: UpdateBillData): Promise<BillListItem> {
    const rows = await this.db
      .update(schema.bills)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(schema.bills.id, id), eq(schema.bills.householdId, householdId)))
      .returning({ id: schema.bills.id });

    if (rows.length === 0) throw new BillNotFoundException(id);
    return this.getOne(id, householdId);
  }

  async delete(id: string, householdId: string): Promise<void> {
    const rows = await this.db
      .delete(schema.bills)
      .where(and(eq(schema.bills.id, id), eq(schema.bills.householdId, householdId)))
      .returning({ id: schema.bills.id });

    if (rows.length === 0) throw new BillNotFoundException(id);
  }

  private async getOne(id: string, householdId: string): Promise<BillListItem> {
    const [item] = await this.findAllByHousehold(householdId, new Date()).then((items) =>
      items.filter((i) => i.id === id),
    );
    if (!item) throw new BillNotFoundException(id);
    return item;
  }
}
