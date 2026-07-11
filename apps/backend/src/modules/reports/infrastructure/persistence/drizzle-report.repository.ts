import { Inject, Injectable } from "@nestjs/common";
import { and, eq, gte, isNull, lt, sql } from "drizzle-orm";
import { monthBounds, toISODate } from "../../../../common/finance/due-date";
import { findHouseholdMemberUserIds } from "../../../../common/household/household-members";
import { DRIZZLE, DRIZZLE_ADMIN, type DrizzleDB } from "../../../../database/database.module";
import * as schema from "../../../../database/schema";
import type {
  AnnualReport,
  CategorySlice,
  IReportRepository,
  MonthPoint,
  MonthTotals,
  MonthlyReport,
  PersonSlice,
} from "../../domain/report.repository.interface";

const UNCATEGORIZED_COLOR = "#94a3b8";
const SERIES_MONTHS = 6;

function monthKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

function buildMonthRange(count: number, endRef: Date): { year: number; month: number }[] {
  const buckets: { year: number; month: number }[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const ref = new Date(endRef.getFullYear(), endRef.getMonth() - i, 1);
    buckets.push({ year: ref.getFullYear(), month: ref.getMonth() + 1 });
  }
  return buckets;
}

function mapSeriesRows(
  buckets: { year: number; month: number }[],
  rows: { period: string; type: string; total: number }[],
): MonthPoint[] {
  const byPeriod = new Map<string, { incomeCents: number; expenseCents: number }>();
  for (const row of rows) {
    const entry = byPeriod.get(row.period) ?? { incomeCents: 0, expenseCents: 0 };
    if (row.type === "income") entry.incomeCents = row.total;
    else if (row.type === "expense") entry.expenseCents = row.total;
    byPeriod.set(row.period, entry);
  }

  return buckets.map(({ year, month }) => {
    const totals = byPeriod.get(monthKey(year, month)) ?? { incomeCents: 0, expenseCents: 0 };
    return { year, month, ...totals };
  });
}

function sumTotals(months: MonthPoint[]): MonthTotals {
  const incomeCents = months.reduce((sum, m) => sum + m.incomeCents, 0);
  const expenseCents = months.reduce((sum, m) => sum + m.expenseCents, 0);
  return { incomeCents, expenseCents, balanceCents: incomeCents - expenseCents };
}

@Injectable()
export class DrizzleReportRepository implements IReportRepository {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    @Inject(DRIZZLE_ADMIN) private readonly admin: DrizzleDB,
  ) {}

  getMonthlyReport(householdId: string, now: Date): Promise<MonthlyReport> {
    return this.buildMonthlyReport(this.db, householdId, now);
  }

  /** Mesma agregação de `getMonthlyReport`, via DRIZZLE_ADMIN (job `monthly-report`, sem request context). */
  getMonthlyReportAdmin(householdId: string, now: Date): Promise<MonthlyReport> {
    return this.buildMonthlyReport(this.admin, householdId, now);
  }

  async findAllActiveHouseholdIds(): Promise<string[]> {
    const rows = await this.admin
      .select({ id: schema.households.id })
      .from(schema.households)
      .where(isNull(schema.households.suspendedAt));
    return rows.map((r) => r.id);
  }

  findHouseholdMemberUserIds(householdId: string): Promise<string[]> {
    return findHouseholdMemberUserIds(this.admin, householdId);
  }

  private async buildMonthlyReport(
    db: DrizzleDB,
    householdId: string,
    now: Date,
  ): Promise<MonthlyReport> {
    const buckets = buildMonthRange(SERIES_MONTHS, now);
    const windowStart = new Date(now.getFullYear(), now.getMonth() - (SERIES_MONTHS - 1), 1);
    const windowEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const { start: curStart, end: curEnd } = monthBounds(now);

    const [seriesRows, byCategory, byPerson] = await Promise.all([
      this.seriesQuery(db, householdId, windowStart, windowEnd),
      this.categoryBreakdown(db, householdId, curStart, curEnd),
      this.personBreakdown(db, householdId, curStart, curEnd),
    ]);

    return {
      months: mapSeriesRows(buckets, seriesRows),
      byCategory,
      byPerson,
      refMonth: { month: now.getMonth() + 1, year: now.getFullYear() },
    };
  }

  async getAnnualReport(householdId: string, year: number): Promise<AnnualReport> {
    const buckets = Array.from({ length: 12 }, (_, i) => ({ year, month: i + 1 }));
    const windowStart = new Date(year, 0, 1);
    const windowEnd = new Date(year + 1, 0, 1);

    const seriesRows = await this.seriesQuery(this.db, householdId, windowStart, windowEnd);
    const months = mapSeriesRows(buckets, seriesRows);

    return { year, months, totals: sumTotals(months) };
  }

  private async seriesQuery(
    db: DrizzleDB,
    householdId: string,
    start: Date,
    end: Date,
  ): Promise<{ period: string; type: string; total: number }[]> {
    return db
      .select({
        period: sql<string>`to_char(${schema.transactions.date}, 'YYYY-MM')`,
        type: schema.transactions.type,
        total: sql<number>`coalesce(sum(${schema.transactions.amountCents}), 0)::int`,
      })
      .from(schema.transactions)
      .where(
        and(
          eq(schema.transactions.householdId, householdId),
          gte(schema.transactions.date, toISODate(start)),
          lt(schema.transactions.date, toISODate(end)),
        ),
      )
      .groupBy(
        sql`to_char(${schema.transactions.date}, 'YYYY-MM')`,
        schema.transactions.type,
      );
  }

  private async categoryBreakdown(
    db: DrizzleDB,
    householdId: string,
    start: Date,
    end: Date,
  ): Promise<CategorySlice[]> {
    const rows = await db
      .select({
        categoryId: schema.transactions.categoryId,
        name: schema.categories.name,
        color: schema.categories.color,
        amountCents: sql<number>`coalesce(sum(${schema.transactions.amountCents}), 0)::int`,
      })
      .from(schema.transactions)
      .leftJoin(schema.categories, eq(schema.categories.id, schema.transactions.categoryId))
      .where(
        and(
          eq(schema.transactions.householdId, householdId),
          eq(schema.transactions.type, "expense"),
          gte(schema.transactions.date, toISODate(start)),
          lt(schema.transactions.date, toISODate(end)),
        ),
      )
      .groupBy(
        schema.transactions.categoryId,
        schema.categories.name,
        schema.categories.color,
      )
      .orderBy(sql`coalesce(sum(${schema.transactions.amountCents}), 0)::int desc`);

    return rows.map((row) => ({
      categoryId: row.categoryId,
      name: row.name ?? "Sem categoria",
      color: row.color ?? UNCATEGORIZED_COLOR,
      amountCents: row.amountCents,
    }));
  }

  private async personBreakdown(
    db: DrizzleDB,
    householdId: string,
    start: Date,
    end: Date,
  ): Promise<PersonSlice[]> {
    const rows = await db
      .select({
        userId: schema.transactions.personId,
        name: schema.users.name,
        amountCents: sql<number>`coalesce(sum(${schema.transactions.amountCents}), 0)::int`,
      })
      .from(schema.transactions)
      .leftJoin(schema.users, eq(schema.users.id, schema.transactions.personId))
      .where(
        and(
          eq(schema.transactions.householdId, householdId),
          eq(schema.transactions.type, "expense"),
          gte(schema.transactions.date, toISODate(start)),
          lt(schema.transactions.date, toISODate(end)),
        ),
      )
      .groupBy(schema.transactions.personId, schema.users.name)
      .orderBy(sql`coalesce(sum(${schema.transactions.amountCents}), 0)::int desc`);

    return rows.map((row) => ({
      userId: row.userId,
      name: row.name ?? "Sem pessoa",
      amountCents: row.amountCents,
    }));
  }
}
