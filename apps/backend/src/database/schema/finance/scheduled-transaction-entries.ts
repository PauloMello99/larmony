import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  date,
  boolean,
  index,
  check,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import {
  transactionTypeEnum,
  recurrenceFrequencyEnum,
  scheduledPostingModeEnum,
} from "../enums";
import { households } from "../households";
import { users } from "../users";
import { categories } from "./categories";

// Lançamento programado (ADR-0020 — unifica bills + recurrences). Movimentação de
// dinheiro agendada, type-neutral (receita OU despesa), com dois modos de postagem:
//  - auto:   o engine do cron gera a transação na ocorrência (cursor next_run_date).
//  - manual: sem geração automática — lembrete por e-mail + botão "lançar" (valor
//            confirmado pelo usuário). next_run_date é sempre NULL nesse modo.
// A cadência (frequency×interval + start_date) subsume o antigo `due_day` das bills.
export const scheduledTransactionEntries = pgTable(
  "scheduled_transaction_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    householdId: uuid("household_id")
      .notNull()
      .references(() => households.id, { onDelete: "cascade" }),
    postingMode: scheduledPostingModeEnum("posting_mode").notNull(),
    // Quem criou a regra — carimbado como `created_by` em cada transação gerada (auto).
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id),
    // Pessoa a quem a transação é atribuída (relatórios por pessoa). NULL = não atribuída.
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
    // Data da 1ª ocorrência (carrega o dia-do-mês para o modo manual mensal).
    startDate: date("start_date").notNull(),
    // Fim opcional da série (inclusive). NULL = indefinida.
    endDate: date("end_date"),
    // Cursor do engine (SÓ modo auto): próxima ocorrência a gerar. Manual = NULL
    // (garantido pelo CHECK abaixo — um scan sem filtro não gera de linha manual).
    nextRunDate: date("next_run_date"),
    isActive: boolean("is_active").notNull().default(true),
    notes: text("notes"),
    // Lembrete (SÓ modo manual): dias antes do vencimento p/ e-mail (1/3/7/15). NULL = sem.
    reminderDaysBefore: integer("reminder_days_before"),
    // Guarda anti-duplicata do lembrete: último envio (dedup por dia da ocorrência).
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
  (t) => [
    index("sched_household_idx").on(t.householdId),
    // Scan do engine (auto): próxima ocorrência vencida de regra ativa.
    index("sched_engine_due_idx").on(t.postingMode, t.isActive, t.nextRunDate),
    // Invariante física: cursor existe SE E SOMENTE SE o modo é auto.
    check(
      "sched_cursor_matches_mode",
      sql`(${t.postingMode} = 'auto') = (${t.nextRunDate} IS NOT NULL)`,
    ),
  ],
);

export const scheduledTransactionEntriesRelations = relations(
  scheduledTransactionEntries,
  ({ one }) => ({
    household: one(households, {
      fields: [scheduledTransactionEntries.householdId],
      references: [households.id],
    }),
    category: one(categories, {
      fields: [scheduledTransactionEntries.categoryId],
      references: [categories.id],
    }),
  }),
);

export type ScheduledTransactionEntry =
  typeof scheduledTransactionEntries.$inferSelect;
export type NewScheduledTransactionEntry =
  typeof scheduledTransactionEntries.$inferInsert;
