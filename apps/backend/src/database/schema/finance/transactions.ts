import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  date,
  index,
  unique,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { transactionTypeEnum } from "../enums";
import { households } from "../households";
import { users } from "../users";
import { categories } from "./categories";
import { scheduledTransactionEntries } from "./scheduled-transaction-entries";

// Agrupa as N parcelas de um parcelamento (ex.: 12x de R$100).
export const installmentGroups = pgTable("installment_groups", {
  id: uuid("id").primaryKey().defaultRandom(),
  householdId: uuid("household_id")
    .notNull()
    .references(() => households.id, { onDelete: "cascade" }),
  description: text("description").notNull(),
  totalAmountCents: integer("total_amount_cents").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// Entidade central: cada gasto/receita. Editável/deletável (sem ledger —
// ADR-0010 superseded). `scheduledTransactionEntryId` liga a tx gerada pelo engine
// (ADR-0020) ao lançamento programado que a originou; SET NULL preserva o histórico
// se a regra sumir.
export const transactions = pgTable(
  "transactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    householdId: uuid("household_id")
      .notNull()
      .references(() => households.id, { onDelete: "cascade" }),
    // Quem REGISTROU no sistema.
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id),
    // Quem REALIZOU o gasto (relatórios por pessoa). NULL = não atribuído.
    personId: uuid("person_id").references(() => users.id, {
      onDelete: "set null",
    }),
    categoryId: uuid("category_id").references(() => categories.id, {
      onDelete: "set null",
    }),
    type: transactionTypeEnum("type").notNull(),
    amountCents: integer("amount_cents").notNull(),
    description: text("description").notNull(),
    // Data da OCORRÊNCIA (não da criação).
    date: date("date").notNull(),
    notes: text("notes"),
    installmentGroupId: uuid("installment_group_id").references(
      () => installmentGroups.id,
      { onDelete: "cascade" },
    ),
    installmentNumber: integer("installment_number"),
    installmentCount: integer("installment_count"),
    // Lançamento programado que gerou esta tx (ADR-0020). NULL = criada pelo usuário.
    scheduledTransactionEntryId: uuid("scheduled_transaction_entry_id").references(
      () => scheduledTransactionEntries.id,
      { onDelete: "set null" },
    ),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("transactions_household_date_idx").on(t.householdId, t.date),
    index("transactions_household_category_idx").on(t.householdId, t.categoryId),
  ],
);

// Rateio entre membros: share NULL = divisão igual entre os listados.
export const transactionMembers = pgTable(
  "transaction_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    transactionId: uuid("transaction_id")
      .notNull()
      .references(() => transactions.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    shareAmountCents: integer("share_amount_cents"),
  },
  (t) => [unique().on(t.transactionId, t.userId)],
);

export const installmentGroupsRelations = relations(
  installmentGroups,
  ({ many }) => ({
    transactions: many(transactions),
  }),
);

export const transactionsRelations = relations(transactions, ({ one, many }) => ({
  household: one(households, {
    fields: [transactions.householdId],
    references: [households.id],
  }),
  category: one(categories, {
    fields: [transactions.categoryId],
    references: [categories.id],
  }),
  installmentGroup: one(installmentGroups, {
    fields: [transactions.installmentGroupId],
    references: [installmentGroups.id],
  }),
  scheduledEntry: one(scheduledTransactionEntries, {
    fields: [transactions.scheduledTransactionEntryId],
    references: [scheduledTransactionEntries.id],
  }),
  members: many(transactionMembers),
}));

export const transactionMembersRelations = relations(
  transactionMembers,
  ({ one }) => ({
    transaction: one(transactions, {
      fields: [transactionMembers.transactionId],
      references: [transactions.id],
    }),
  }),
);

export type InstallmentGroup = typeof installmentGroups.$inferSelect;
export type NewInstallmentGroup = typeof installmentGroups.$inferInsert;
export type Transaction = typeof transactions.$inferSelect;
export type NewTransaction = typeof transactions.$inferInsert;
export type TransactionMember = typeof transactionMembers.$inferSelect;
export type NewTransactionMember = typeof transactionMembers.$inferInsert;
