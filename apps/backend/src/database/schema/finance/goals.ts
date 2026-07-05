import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  date,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { households } from "../households";
import { users } from "../users";

// Metas de poupança. current_amount é DERIVADO (SUM das contribuições no
// use-case) — sem coluna persistida nem trigger (ver domain-rules).
export const goals = pgTable(
  "goals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    householdId: uuid("household_id")
      .notNull()
      .references(() => households.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    targetAmountCents: integer("target_amount_cents").notNull(),
    targetDate: date("target_date"),
    color: text("color").notNull().default("#8b8b8b"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("goals_household_idx").on(t.householdId)],
);

export const goalContributions = pgTable(
  "goal_contributions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    goalId: uuid("goal_id")
      .notNull()
      .references(() => goals.id, { onDelete: "cascade" }),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id),
    amountCents: integer("amount_cents").notNull(),
    date: date("date").notNull(),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("goal_contributions_goal_idx").on(t.goalId)],
);

export const goalsRelations = relations(goals, ({ one, many }) => ({
  household: one(households, {
    fields: [goals.householdId],
    references: [households.id],
  }),
  contributions: many(goalContributions),
}));

export const goalContributionsRelations = relations(
  goalContributions,
  ({ one }) => ({
    goal: one(goals, {
      fields: [goalContributions.goalId],
      references: [goals.id],
    }),
  }),
);

export type Goal = typeof goals.$inferSelect;
export type NewGoal = typeof goals.$inferInsert;
export type GoalContribution = typeof goalContributions.$inferSelect;
export type NewGoalContribution = typeof goalContributions.$inferInsert;
