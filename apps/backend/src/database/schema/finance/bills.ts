import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  boolean,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { households } from "../households";
import { categories } from "./categories";

// Contas fixas/recorrentes: definições ESTÁTICAS — nunca geram transactions
// automaticamente (lançamento é manual). Lembrete por e-mail via cron (M7).
export const bills = pgTable(
  "bills",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    householdId: uuid("household_id")
      .notNull()
      .references(() => households.id, { onDelete: "cascade" }),
    categoryId: uuid("category_id").references(() => categories.id, {
      onDelete: "set null",
    }),
    name: text("name").notNull(),
    amountCents: integer("amount_cents").notNull(),
    // Dia do mês do vencimento (1–31; meses curtos: último dia — regra no M7).
    dueDay: integer("due_day").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    notes: text("notes"),
    // Dias antes do vencimento para lembrar por e-mail (1/3/7/15). NULL = sem lembrete.
    reminderDaysBefore: integer("reminder_days_before"),
    // Guarda anti-duplicata: último envio de lembrete (1 por mês).
    reminderLastSentAt: timestamp("reminder_last_sent_at", {
      withTimezone: true,
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("bills_household_idx").on(t.householdId)],
);

export const billsRelations = relations(bills, ({ one }) => ({
  household: one(households, {
    fields: [bills.householdId],
    references: [households.id],
  }),
  category: one(categories, {
    fields: [bills.categoryId],
    references: [categories.id],
  }),
}));

export type Bill = typeof bills.$inferSelect;
export type NewBill = typeof bills.$inferInsert;
