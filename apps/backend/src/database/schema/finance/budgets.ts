import {
  pgTable,
  uuid,
  timestamp,
  integer,
  unique,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { households } from "../households";
import { categories } from "./categories";

// Limite de gasto mensal por categoria. Spending é calculado em tempo real via
// query de transactions — nunca persistido (ver domain-rules).
export const budgets = pgTable(
  "budgets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    householdId: uuid("household_id")
      .notNull()
      .references(() => households.id, { onDelete: "cascade" }),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),
    month: integer("month").notNull(), // 1–12
    year: integer("year").notNull(),
    amountCents: integer("amount_cents").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    unique().on(t.householdId, t.categoryId, t.month, t.year),
    index("budgets_household_period_idx").on(t.householdId, t.year, t.month),
  ],
);

export const budgetsRelations = relations(budgets, ({ one }) => ({
  household: one(households, {
    fields: [budgets.householdId],
    references: [households.id],
  }),
  category: one(categories, {
    fields: [budgets.categoryId],
    references: [categories.id],
  }),
}));

export type Budget = typeof budgets.$inferSelect;
export type NewBudget = typeof budgets.$inferInsert;
