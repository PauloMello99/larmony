import { Inject, Injectable } from "@nestjs/common";
import { and, desc, eq, gte, lt, sql } from "drizzle-orm";
import { DRIZZLE, type DrizzleDB } from "../../../../database/database.module";
import * as schema from "../../../../database/schema";
import { daysBetween, monthBounds, nextDueDate, toISODate } from "../../../../common/finance/due-date";
import type {
  BudgetProgress,
  GoalProgress,
  HouseholdOverviewData,
  IHouseholdOverviewRepository,
  MonthTotals,
  RecentTransaction,
  UpcomingBill,
} from "../../domain/household-overview.repository.interface";

/**
 * Agrega KPIs do lar direto das tabelas finance (vazias até o M2 — os valores
 * vêm zerados/arrays vazios hoje, e ganham vida sem retrabalho quando
 * transactions/goals/budgets/bills tiverem módulo). Conexão RLS-enforced
 * (DRIZZLE) — a query já é escopada por householdId, e o membership foi
 * verificado no use-case antes de chamar este repositório.
 */
@Injectable()
export class DrizzleHouseholdOverviewRepository implements IHouseholdOverviewRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async getOverview(householdId: string, now: Date): Promise<HouseholdOverviewData> {
    const { start: curStart, end: curEnd } = monthBounds(now);
    const prevRef = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const { start: prevStart, end: prevEnd } = monthBounds(prevRef);

    const [currentMonth, previousMonth, goals, upcomingBills, recentTransactions, budgets] =
      await Promise.all([
        this.monthTotals(householdId, curStart, curEnd),
        this.monthTotals(householdId, prevStart, prevEnd),
        this.goalsSummary(householdId),
        this.upcomingBills(householdId, now),
        this.recentTransactions(householdId),
        this.budgetsProgress(householdId, now, curStart, curEnd),
      ]);

    return { currentMonth, previousMonth, goals, upcomingBills, recentTransactions, budgets };
  }

  private async monthTotals(householdId: string, start: Date, end: Date): Promise<MonthTotals> {
    const rows = await this.db
      .select({
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
      .groupBy(schema.transactions.type);

    const incomeCents = rows.find((r) => r.type === "income")?.total ?? 0;
    const expenseCents = rows.find((r) => r.type === "expense")?.total ?? 0;
    return { incomeCents, expenseCents, balanceCents: incomeCents - expenseCents };
  }

  private async goalsSummary(
    householdId: string,
  ): Promise<{ savedCents: number; activeCount: number; top: GoalProgress[] }> {
    const rows = await this.db
      .select({
        id: schema.goals.id,
        name: schema.goals.name,
        color: schema.goals.color,
        targetAmountCents: schema.goals.targetAmountCents,
        savedCents: sql<number>`coalesce(sum(${schema.goalContributions.amountCents}), 0)::int`,
      })
      .from(schema.goals)
      .leftJoin(schema.goalContributions, eq(schema.goalContributions.goalId, schema.goals.id))
      .where(eq(schema.goals.householdId, householdId))
      .groupBy(schema.goals.id);

    const savedCents = rows.reduce((sum, r) => sum + r.savedCents, 0);
    const activeCount = rows.filter((r) => r.savedCents < r.targetAmountCents).length;
    // Top 3 por % de progresso (mesmo padrão do top-3 de budgets).
    const top = rows
      .map((r) => ({
        id: r.id,
        name: r.name,
        color: r.color,
        savedCents: r.savedCents,
        targetCents: r.targetAmountCents,
      }))
      .sort((a, b) => b.savedCents / b.targetCents - a.savedCents / a.targetCents)
      .slice(0, 3);
    return { savedCents, activeCount, top };
  }

  private async upcomingBills(householdId: string, now: Date): Promise<UpcomingBill[]> {
    const rows = await this.db
      .select({
        id: schema.bills.id,
        name: schema.bills.name,
        amountCents: schema.bills.amountCents,
        dueDay: schema.bills.dueDay,
      })
      .from(schema.bills)
      .where(and(eq(schema.bills.householdId, householdId), eq(schema.bills.isActive, true)));

    return rows
      .map((b) => {
        const due = nextDueDate(b.dueDay, now);
        return {
          id: b.id,
          name: b.name,
          amountCents: b.amountCents,
          dueDate: toISODate(due),
          daysUntilDue: daysBetween(now, due),
        };
      })
      .filter((b) => b.daysUntilDue <= 7)
      .sort((a, b) => a.daysUntilDue - b.daysUntilDue)
      .slice(0, 5);
  }

  private async recentTransactions(householdId: string): Promise<RecentTransaction[]> {
    return this.db
      .select({
        id: schema.transactions.id,
        description: schema.transactions.description,
        amountCents: schema.transactions.amountCents,
        type: schema.transactions.type,
        date: schema.transactions.date,
        categoryName: schema.categories.name,
        categoryColor: schema.categories.color,
      })
      .from(schema.transactions)
      .leftJoin(schema.categories, eq(schema.categories.id, schema.transactions.categoryId))
      .where(eq(schema.transactions.householdId, householdId))
      .orderBy(desc(schema.transactions.date), desc(schema.transactions.createdAt))
      .limit(5);
  }

  private async budgetsProgress(
    householdId: string,
    now: Date,
    curStart: Date,
    curEnd: Date,
  ): Promise<BudgetProgress[]> {
    const rows = await this.db
      .select({
        id: schema.budgets.id,
        categoryName: schema.categories.name,
        categoryColor: schema.categories.color,
        limitCents: schema.budgets.amountCents,
        spentCents: sql<number>`coalesce(sum(case when ${schema.transactions.type} = 'expense' then ${schema.transactions.amountCents} else 0 end), 0)::int`,
      })
      .from(schema.budgets)
      .innerJoin(schema.categories, eq(schema.categories.id, schema.budgets.categoryId))
      .leftJoin(
        schema.transactions,
        and(
          eq(schema.transactions.categoryId, schema.budgets.categoryId),
          eq(schema.transactions.householdId, schema.budgets.householdId),
          gte(schema.transactions.date, toISODate(curStart)),
          lt(schema.transactions.date, toISODate(curEnd)),
        ),
      )
      .where(
        and(
          eq(schema.budgets.householdId, householdId),
          eq(schema.budgets.month, now.getMonth() + 1),
          eq(schema.budgets.year, now.getFullYear()),
        ),
      )
      .groupBy(
        schema.budgets.id,
        schema.categories.name,
        schema.categories.color,
        schema.budgets.amountCents,
      );

    return rows
      .sort((a, b) => b.spentCents / b.limitCents - a.spentCents / a.limitCents)
      .slice(0, 3);
  }
}
