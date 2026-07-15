import { Inject, Injectable } from "@nestjs/common";
import { and, desc, eq, sql } from "drizzle-orm";
import { DRIZZLE, type DrizzleDB } from "../../../../database/database.module";
import * as schema from "../../../../database/schema";
import { findHouseholdMemberUserIds } from "../../../../common/household/household-members";
import type { GoalEntity } from "../../domain/goal.entity";
import type {
  CreateContributionData,
  CreateGoalData,
  GoalContributionItem,
  GoalListItem,
  IGoalRepository,
  UpdateGoalData,
} from "../../domain/goal.repository.interface";
import { GoalNotFoundException } from "../../domain/exceptions/goal-not-found.exception";
import { GoalContributionNotFoundException } from "../../domain/exceptions/goal-contribution-not-found.exception";
import { GoalMapper } from "./goal.mapper";

@Injectable()
export class DrizzleGoalRepository implements IGoalRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async findAllByHousehold(householdId: string): Promise<GoalListItem[]> {
    // savedCents derivado em runtime (SUM das contribuições) — nunca persistido.
    return this.db
      .select({
        id: schema.goals.id,
        householdId: schema.goals.householdId,
        name: schema.goals.name,
        description: schema.goals.description,
        targetAmountCents: schema.goals.targetAmountCents,
        targetDate: schema.goals.targetDate,
        color: schema.goals.color,
        savedCents: sql<number>`coalesce(sum(${schema.goalContributions.amountCents}), 0)::int`,
        createdAt: schema.goals.createdAt,
        updatedAt: schema.goals.updatedAt,
      })
      .from(schema.goals)
      .leftJoin(
        schema.goalContributions,
        eq(schema.goalContributions.goalId, schema.goals.id),
      )
      .where(eq(schema.goals.householdId, householdId))
      .groupBy(schema.goals.id)
      .orderBy(desc(schema.goals.createdAt));
  }

  async findById(id: string, householdId: string): Promise<GoalEntity | null> {
    const [row] = await this.db
      .select()
      .from(schema.goals)
      .where(and(eq(schema.goals.id, id), eq(schema.goals.householdId, householdId)))
      .limit(1);

    return row ? GoalMapper.toDomain(row) : null;
  }

  async create(householdId: string, data: CreateGoalData): Promise<GoalEntity> {
    const [row] = await this.db
      .insert(schema.goals)
      .values({
        householdId,
        name: data.name,
        targetAmountCents: data.targetAmountCents,
        description: data.description ?? null,
        targetDate: data.targetDate ?? null,
        ...(data.color ? { color: data.color } : {}),
      })
      .returning();

    if (!row) throw new Error("Failed to create goal");
    return GoalMapper.toDomain(row);
  }

  async update(id: string, householdId: string, data: UpdateGoalData): Promise<GoalEntity> {
    const [row] = await this.db
      .update(schema.goals)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(schema.goals.id, id), eq(schema.goals.householdId, householdId)))
      .returning();

    if (!row) throw new GoalNotFoundException(id);
    return GoalMapper.toDomain(row);
  }

  async delete(id: string, householdId: string): Promise<void> {
    const rows = await this.db
      .delete(schema.goals)
      .where(and(eq(schema.goals.id, id), eq(schema.goals.householdId, householdId)))
      .returning({ id: schema.goals.id });

    if (rows.length === 0) throw new GoalNotFoundException(id);
  }

  async findContributions(
    goalId: string,
    householdId: string,
  ): Promise<GoalContributionItem[]> {
    await this.assertGoal(goalId, householdId);

    return this.db
      .select({
        id: schema.goalContributions.id,
        goalId: schema.goalContributions.goalId,
        createdBy: schema.goalContributions.createdBy,
        authorName: schema.users.name,
        amountCents: schema.goalContributions.amountCents,
        date: schema.goalContributions.date,
        notes: schema.goalContributions.notes,
        createdAt: schema.goalContributions.createdAt,
      })
      .from(schema.goalContributions)
      .leftJoin(schema.users, eq(schema.users.id, schema.goalContributions.createdBy))
      .where(eq(schema.goalContributions.goalId, goalId))
      .orderBy(desc(schema.goalContributions.date), desc(schema.goalContributions.createdAt));
  }

  async addContribution(
    goalId: string,
    householdId: string,
    createdBy: string,
    data: CreateContributionData,
  ): Promise<GoalContributionItem> {
    await this.assertGoal(goalId, householdId);

    const [row] = await this.db
      .insert(schema.goalContributions)
      .values({
        goalId,
        createdBy,
        amountCents: data.amountCents,
        date: data.date,
        notes: data.notes ?? null,
      })
      .returning();

    if (!row) throw new Error("Failed to create goal contribution");

    const [author] = await this.db
      .select({ name: schema.users.name })
      .from(schema.users)
      .where(eq(schema.users.id, createdBy))
      .limit(1);

    return { ...row, authorName: author?.name ?? null };
  }

  async deleteContribution(
    contributionId: string,
    goalId: string,
    householdId: string,
  ): Promise<void> {
    await this.assertGoal(goalId, householdId);

    const rows = await this.db
      .delete(schema.goalContributions)
      .where(
        and(
          eq(schema.goalContributions.id, contributionId),
          eq(schema.goalContributions.goalId, goalId),
        ),
      )
      .returning({ id: schema.goalContributions.id });

    if (rows.length === 0) throw new GoalContributionNotFoundException(contributionId);
  }

  async sumContributions(goalId: string): Promise<number> {
    const [row] = await this.db
      .select({ total: sql<number>`coalesce(sum(${schema.goalContributions.amountCents}), 0)::int` })
      .from(schema.goalContributions)
      .where(eq(schema.goalContributions.goalId, goalId));
    return row?.total ?? 0;
  }

  async findHouseholdMemberUserIds(householdId: string): Promise<string[]> {
    return findHouseholdMemberUserIds(this.db, householdId);
  }

  /** Aportes são sempre escopados via goal pai — 404 se a meta não é do lar. */
  private async assertGoal(goalId: string, householdId: string): Promise<void> {
    const [row] = await this.db
      .select({ id: schema.goals.id })
      .from(schema.goals)
      .where(and(eq(schema.goals.id, goalId), eq(schema.goals.householdId, householdId)))
      .limit(1);

    if (!row) throw new GoalNotFoundException(goalId);
  }
}
