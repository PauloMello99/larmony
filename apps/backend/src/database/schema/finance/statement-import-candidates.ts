import { pgTable, uuid, text, timestamp, integer, date, index, unique } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import {
  transactionTypeEnum,
  categoryConfidenceEnum,
  statementImportCandidateStatusEnum,
} from "../enums";
import { households } from "../households";
import { transactions } from "./transactions";
import { categories } from "./categories";
import { statementImportJobs } from "./statement-import-jobs";

// Staging — NUNCA é `transactions` (ADR-0034): confirmação do usuário chama
// CreateTransactionUseCase existente, que preenche `transactionId` aqui.
// unique(household_id, external_id) é a proteção de dedup contra reimport do
// mesmo período — um insert repetido é descartado (onConflictDoNothing), não
// vira uma 2ª linha "duplicate" (esse valor do enum fica reservado/inalcançável
// nesta fase).
export const statementImportCandidates = pgTable(
  "statement_import_candidates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    jobId: uuid("job_id")
      .notNull()
      .references(() => statementImportJobs.id, { onDelete: "cascade" }),
    householdId: uuid("household_id")
      .notNull()
      .references(() => households.id, { onDelete: "cascade" }),
    externalId: text("external_id").notNull(),
    date: date("date").notNull(),
    amountCents: integer("amount_cents").notNull(),
    type: transactionTypeEnum("type").notNull(),
    description: text("description").notNull(),
    categoryId: uuid("category_id").references(() => categories.id, {
      onDelete: "set null",
    }),
    categoryConfidence: categoryConfidenceEnum("category_confidence"),
    // Vocabulário do processor Python (structural/household_member/keyword/
    // cnpj_cnae/merchant_memory/ml_classifier/llm_fallback/unresolved) — texto
    // livre de propósito, cresce nas Fases 4/5 sem migration no backend.
    resolvedBy: text("resolved_by").notNull(),
    merchantKey: text("merchant_key"),
    status: statementImportCandidateStatusEnum("status")
      .notNull()
      .default("pending_review"),
    transactionId: uuid("transaction_id").references(() => transactions.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    unique().on(t.householdId, t.externalId),
    index("statement_import_candidates_job_idx").on(t.jobId),
    index("statement_import_candidates_household_status_idx").on(
      t.householdId,
      t.status,
    ),
  ],
);

export const statementImportCandidatesRelations = relations(
  statementImportCandidates,
  ({ one }) => ({
    job: one(statementImportJobs, {
      fields: [statementImportCandidates.jobId],
      references: [statementImportJobs.id],
    }),
    household: one(households, {
      fields: [statementImportCandidates.householdId],
      references: [households.id],
    }),
    category: one(categories, {
      fields: [statementImportCandidates.categoryId],
      references: [categories.id],
    }),
    transaction: one(transactions, {
      fields: [statementImportCandidates.transactionId],
      references: [transactions.id],
    }),
  }),
);

export type StatementImportCandidate =
  typeof statementImportCandidates.$inferSelect;
export type NewStatementImportCandidate =
  typeof statementImportCandidates.$inferInsert;
