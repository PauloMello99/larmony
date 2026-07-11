import {
  pgTable,
  uuid,
  timestamp,
  date,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { households } from "../households";
import { categories } from "./categories";
import { budgetVersions } from "./budget-versions";

// Série de orçamento por categoria (M10). O limite em si vive em
// `budget_versions` — esta tabela só identifica a série e, opcionalmente, o
// mês em que ela deixou de valer (`ended_from`, exclusivo). Resolução do
// limite por período e spending são sempre derivados em runtime — nunca
// persistidos (ver domain-rules).
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
    endedFrom: date("ended_from"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    // Só uma série ABERTA por categoria — séries encerradas (ended_from
    // preenchido) não conflitam, permitindo recriar após remover. Constraint
    // UNIQUE não suporta condição parcial no Postgres — precisa ser um índice.
    uniqueIndex("budgets_open_series_unique")
      .on(t.householdId, t.categoryId)
      .where(sql`${t.endedFrom} is null`),
    index("budgets_household_category_idx").on(t.householdId, t.categoryId),
  ],
);

export const budgetsRelations = relations(budgets, ({ one, many }) => ({
  household: one(households, {
    fields: [budgets.householdId],
    references: [households.id],
  }),
  category: one(categories, {
    fields: [budgets.categoryId],
    references: [categories.id],
  }),
  versions: many(budgetVersions),
}));

export type Budget = typeof budgets.$inferSelect;
export type NewBudget = typeof budgets.$inferInsert;
