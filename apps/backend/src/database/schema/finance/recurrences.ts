import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  date,
  boolean,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { transactionTypeEnum, recurrenceFrequencyEnum } from "../enums";
import { households } from "../households";
import { users } from "../users";
import { categories } from "./categories";

// Regra de recorrência (M9): gera transações AUTOMATICAMENTE no tick do cron
// (recurrence-engine), diferente de bills (definição estática + lembrete manual).
// Sem parcelamento e sem rateio no v1 — cada ocorrência é uma transação simples.
export const recurrences = pgTable(
  "recurrences",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    householdId: uuid("household_id")
      .notNull()
      .references(() => households.id, { onDelete: "cascade" }),
    // Quem CRIOU a regra — carimbado como `created_by` em cada transação gerada.
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id),
    // Pessoa a quem a transação gerada é atribuída (relatórios por pessoa). NULL = não atribuída.
    personId: uuid("person_id").references(() => users.id, {
      onDelete: "set null",
    }),
    categoryId: uuid("category_id").references(() => categories.id, {
      onDelete: "set null",
    }),
    type: transactionTypeEnum("type").notNull(),
    amountCents: integer("amount_cents").notNull(),
    description: text("description").notNull(),
    frequency: recurrenceFrequencyEnum("frequency").notNull(),
    // "a cada N períodos" (default 1).
    interval: integer("interval").notNull().default(1),
    // Data da 1ª ocorrência.
    startDate: date("start_date").notNull(),
    // Fim opcional da série (inclusive). NULL = indefinida.
    endDate: date("end_date"),
    // Cursor do engine: próxima ocorrência a gerar (= start_date no create).
    nextRunDate: date("next_run_date").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("recurrences_household_idx").on(t.householdId),
    // Scan do engine: regras ativas com ocorrência vencida.
    index("recurrences_due_idx").on(t.isActive, t.nextRunDate),
  ],
);

export const recurrencesRelations = relations(recurrences, ({ one }) => ({
  household: one(households, {
    fields: [recurrences.householdId],
    references: [households.id],
  }),
  category: one(categories, {
    fields: [recurrences.categoryId],
    references: [categories.id],
  }),
}));

export type Recurrence = typeof recurrences.$inferSelect;
export type NewRecurrence = typeof recurrences.$inferInsert;
