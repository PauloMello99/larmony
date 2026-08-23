import { pgTable, uuid, text, timestamp, jsonb, index } from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { statementImportSourceEnum, statementImportJobStatusEnum } from "../enums";
import { households } from "../households";
import { users } from "../users";

// Um job por upload de extrato (ADR-0034). Arquivo bruto NÃO é persistido
// (minimização de dado) — só o resultado do processor Python via callback.
export const statementImportJobs = pgTable(
  "statement_import_jobs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    householdId: uuid("household_id")
      .notNull()
      .references(() => households.id, { onDelete: "cascade" }),
    // Quem fez o upload — destinatário da notificação de conclusão/falha.
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id),
    source: statementImportSourceEnum("source").notNull(),
    status: statementImportJobStatusEnum("status").notNull().default("pending"),
    errorCode: text("error_code"),
    errorMessage: text("error_message"),
    // Stats do callback de sucesso (total/resolvedByRules/resolvedByLlm/
    // unresolved/processingMs) — usadas na notificação, sem reconsultar candidates.
    stats: jsonb("stats"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (t) => [
    index("statement_import_jobs_household_status_idx").on(
      t.householdId,
      t.status,
    ),
    // A reconciliação do cron roda via DRIZZLE_ADMIN sem filtro de household
    // (scan cross-tenant por design — jobs presos de qualquer lar) — o
    // composto acima não serve de prefixo útil pra essa query.
    index("statement_import_jobs_reconciliation_idx")
      .on(t.status, t.createdAt)
      .where(sql`${t.status} IN ('pending', 'processing')`),
  ],
);

export const statementImportJobsRelations = relations(
  statementImportJobs,
  ({ one }) => ({
    household: one(households, {
      fields: [statementImportJobs.householdId],
      references: [households.id],
    }),
  }),
);

export type StatementImportJob = typeof statementImportJobs.$inferSelect;
export type NewStatementImportJob = typeof statementImportJobs.$inferInsert;
