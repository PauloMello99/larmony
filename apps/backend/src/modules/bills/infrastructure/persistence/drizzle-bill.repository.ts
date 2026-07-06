import { Inject, Injectable } from "@nestjs/common";
import { and, eq, isNotNull } from "drizzle-orm";
import { DRIZZLE_ADMIN, type DrizzleDB } from "../../../../database/database.module";
import * as schema from "../../../../database/schema";
import { BillEntity } from "../../domain/bill.entity";
import type { IBillRepository } from "../../domain/bill.repository.interface";

@Injectable()
export class DrizzleBillRepository implements IBillRepository {
  // Job de cron roda fora de request/RLS context → conexão admin, escopo
  // garantido pelas próprias queries (não há input de usuário aqui).
  constructor(@Inject(DRIZZLE_ADMIN) private readonly db: DrizzleDB) {}

  async findActiveWithReminder(): Promise<BillEntity[]> {
    const rows = await this.db
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
    await this.db
      .update(schema.bills)
      .set({ reminderLastSentAt: at, updatedAt: at })
      .where(eq(schema.bills.id, billId));
  }

  async findHouseholdMemberUserIds(householdId: string): Promise<string[]> {
    const rows = await this.db
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
}
