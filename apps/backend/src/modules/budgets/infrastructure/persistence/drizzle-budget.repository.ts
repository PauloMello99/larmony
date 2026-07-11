import { Inject, Injectable } from "@nestjs/common";
import { and, asc, desc, eq, gt, gte, isNull, lt, lte, or, sql } from "drizzle-orm";
import { DRIZZLE, DRIZZLE_ADMIN, type DrizzleDB } from "../../../../database/database.module";
import * as schema from "../../../../database/schema";
import { currentPeriodStart, monthBounds, periodStart, toISODate } from "../../../../common/finance/due-date";
import { findHouseholdMemberUserIds } from "../../../../common/household/household-members";
import type {
  BudgetListItem,
  CreateBudgetData,
  IBudgetRepository,
} from "../../domain/budget.repository.interface";
import type { BudgetEntity } from "../../domain/budget.entity";
import { BudgetNotFoundException } from "../../domain/exceptions/budget-not-found.exception";
import { BudgetAlreadyExistsException } from "../../domain/exceptions/budget-already-exists.exception";
import { BudgetPeriodNotEditableException } from "../../domain/exceptions/budget-period-not-editable.exception";
import { BudgetMapper } from "./budget.mapper";

/** Código Postgres de violação de unique constraint. */
const PG_UNIQUE_VIOLATION = "23505";

@Injectable()
export class DrizzleBudgetRepository implements IBudgetRepository {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    // Só para findBudgetForCategoryPeriod/findHouseholdMemberUserIds — o
    // evento "orçamento estourado" (M11) dispara tanto de request context
    // (CreateTransactionUseCase) quanto de cron (CreateGeneratedTransactionUseCase,
    // engine auto), e RLS-scoped DRIZZLE sem claims (cron) bloquearia a leitura
    // silenciosamente. Todo o resto do repositório segue em `db` (RLS).
    @Inject(DRIZZLE_ADMIN) private readonly admin: DrizzleDB,
  ) {}

  async findAllByPeriod(
    householdId: string,
    month: number,
    year: number,
  ): Promise<Omit<BudgetListItem, "isEditable" | "isProjected">[]> {
    const periodStartISO = periodStart(month, year);
    const { start, end } = monthBounds(new Date(year, month - 1, 1));

    // Resolução on-read (M10): a versão vigente de cada série é a de maior
    // effective_from <= início do período — nunca materializada. Séries sem
    // nenhuma versão até o período (ainda não existiam) somem naturalmente
    // do inner join abaixo.
    const resolvedVersions = this.db
      .selectDistinctOn([schema.budgetVersions.budgetId], {
        budgetId: schema.budgetVersions.budgetId,
        amountCents: schema.budgetVersions.amountCents,
      })
      .from(schema.budgetVersions)
      .where(lte(schema.budgetVersions.effectiveFrom, periodStartISO))
      .orderBy(schema.budgetVersions.budgetId, desc(schema.budgetVersions.effectiveFrom))
      .as("resolved_versions");

    // Spending derivado em runtime: join correlacionado budgets→transactions por
    // categoria+household dentro do range do mês, somando apenas despesas.
    const rows = await this.db
      .select({
        id: schema.budgets.id,
        householdId: schema.budgets.householdId,
        categoryId: schema.budgets.categoryId,
        categoryName: schema.categories.name,
        categoryColor: schema.categories.color,
        categoryIcon: schema.categories.icon,
        limitCents: resolvedVersions.amountCents,
        spentCents: sql<number>`coalesce(sum(case when ${schema.transactions.type} = 'expense' then ${schema.transactions.amountCents} else 0 end), 0)::int`,
        createdAt: schema.budgets.createdAt,
        updatedAt: schema.budgets.updatedAt,
      })
      .from(schema.budgets)
      .innerJoin(resolvedVersions, eq(resolvedVersions.budgetId, schema.budgets.id))
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
          // Série ainda cobre o período: aberta, ou encerrada só a partir de um mês posterior.
          or(isNull(schema.budgets.endedFrom), gt(schema.budgets.endedFrom, periodStartISO)),
        ),
      )
      .groupBy(
        schema.budgets.id,
        schema.categories.name,
        schema.categories.color,
        schema.categories.icon,
        resolvedVersions.amountCents,
      )
      .orderBy(asc(schema.categories.name));

    return rows.map((row) => ({ ...row, month, year }));
  }

  async create(householdId: string, data: CreateBudgetData): Promise<BudgetEntity> {
    const effectiveFrom = currentPeriodStart();

    try {
      return await this.db.transaction(async (tx) => {
        const [budgetRow] = await tx
          .insert(schema.budgets)
          .values({ householdId, categoryId: data.categoryId })
          .returning();

        if (!budgetRow) throw new Error("Failed to create budget");

        await tx.insert(schema.budgetVersions).values({
          budgetId: budgetRow.id,
          amountCents: data.amountCents,
          effectiveFrom,
        });

        return BudgetMapper.toDomain(budgetRow);
      });
    } catch (err) {
      if (isUniqueViolation(err)) throw new BudgetAlreadyExistsException();
      throw err;
    }
  }

  async upsertCurrentVersion(
    id: string,
    householdId: string,
    amountCents: number,
  ): Promise<BudgetEntity> {
    const [budgetRow] = await this.db
      .select()
      .from(schema.budgets)
      .where(and(eq(schema.budgets.id, id), eq(schema.budgets.householdId, householdId)));

    if (!budgetRow) throw new BudgetNotFoundException(id);
    if (budgetRow.endedFrom !== null) throw new BudgetPeriodNotEditableException(id);

    const effectiveFrom = currentPeriodStart();

    // Upsert = nunca altera uma versão passada; reeditar no mesmo mês
    // sobrescreve a mesma versão em vez de criar outra.
    await this.db
      .insert(schema.budgetVersions)
      .values({ budgetId: id, amountCents, effectiveFrom })
      .onConflictDoUpdate({
        target: [schema.budgetVersions.budgetId, schema.budgetVersions.effectiveFrom],
        set: { amountCents, updatedAt: new Date() },
      });

    return BudgetMapper.toDomain(budgetRow);
  }

  async endSeries(id: string, householdId: string): Promise<void> {
    const endedFrom = currentPeriodStart();

    const rows = await this.db
      .update(schema.budgets)
      .set({ endedFrom, updatedAt: new Date() })
      .where(
        and(
          eq(schema.budgets.id, id),
          eq(schema.budgets.householdId, householdId),
          isNull(schema.budgets.endedFrom),
        ),
      )
      .returning({ id: schema.budgets.id });

    if (rows.length === 0) throw new BudgetNotFoundException(id);
  }

  findBudgetForCategoryPeriod(
    householdId: string,
    categoryId: string,
    month: number,
    year: number,
  ): Promise<{
    budgetId: string;
    categoryName: string;
    limitCents: number;
    spentCents: number;
  } | null> {
    return this.resolveBudgetForCategoryPeriod(this.db, householdId, categoryId, month, year);
  }

  findBudgetForCategoryPeriodAdmin(
    householdId: string,
    categoryId: string,
    month: number,
    year: number,
  ): Promise<{
    budgetId: string;
    categoryName: string;
    limitCents: number;
    spentCents: number;
  } | null> {
    return this.resolveBudgetForCategoryPeriod(this.admin, householdId, categoryId, month, year);
  }

  private async resolveBudgetForCategoryPeriod(
    db: DrizzleDB,
    householdId: string,
    categoryId: string,
    month: number,
    year: number,
  ): Promise<{
    budgetId: string;
    categoryName: string;
    limitCents: number;
    spentCents: number;
  } | null> {
    const periodStartISO = periodStart(month, year);
    const { start, end } = monthBounds(new Date(year, month - 1, 1));

    // Mesma resolução on-read do M10 (findAllByPeriod), escopada a UMA
    // categoria — usada pelo evento "orçamento estourado" (M11) logo após
    // uma despesa ser gravada.
    const resolvedVersions = db
      .selectDistinctOn([schema.budgetVersions.budgetId], {
        budgetId: schema.budgetVersions.budgetId,
        amountCents: schema.budgetVersions.amountCents,
      })
      .from(schema.budgetVersions)
      .where(lte(schema.budgetVersions.effectiveFrom, periodStartISO))
      .orderBy(schema.budgetVersions.budgetId, desc(schema.budgetVersions.effectiveFrom))
      .as("resolved_versions");

    const [row] = await db
      .select({
        budgetId: schema.budgets.id,
        categoryName: schema.categories.name,
        limitCents: resolvedVersions.amountCents,
        spentCents: sql<number>`coalesce(sum(case when ${schema.transactions.type} = 'expense' then ${schema.transactions.amountCents} else 0 end), 0)::int`,
      })
      .from(schema.budgets)
      .innerJoin(resolvedVersions, eq(resolvedVersions.budgetId, schema.budgets.id))
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
          eq(schema.budgets.categoryId, categoryId),
          or(isNull(schema.budgets.endedFrom), gt(schema.budgets.endedFrom, periodStartISO)),
        ),
      )
      .groupBy(schema.budgets.id, schema.categories.name, resolvedVersions.amountCents);

    return row ?? null;
  }

  async findHouseholdMemberUserIds(householdId: string): Promise<string[]> {
    return findHouseholdMemberUserIds(this.admin, householdId);
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
