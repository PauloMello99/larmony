import { pgTable, uuid, integer, timestamp, date, unique, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { budgets } from "./budgets";

// Histórico de limites de uma série de orçamento (M10). O limite aplicável a
// um período é a versão com maior `effective_from` <= início do período —
// resolvido on-read no repositório, nunca materializado.
export const budgetVersions = pgTable(
  "budget_versions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    budgetId: uuid("budget_id")
      .notNull()
      .references(() => budgets.id, { onDelete: "cascade" }),
    amountCents: integer("amount_cents").notNull(),
    effectiveFrom: date("effective_from").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    unique().on(t.budgetId, t.effectiveFrom),
    index("budget_versions_budget_effective_idx").on(t.budgetId, t.effectiveFrom),
  ],
);

export const budgetVersionsRelations = relations(budgetVersions, ({ one }) => ({
  budget: one(budgets, {
    fields: [budgetVersions.budgetId],
    references: [budgets.id],
  }),
}));

export type BudgetVersion = typeof budgetVersions.$inferSelect;
export type NewBudgetVersion = typeof budgetVersions.$inferInsert;
