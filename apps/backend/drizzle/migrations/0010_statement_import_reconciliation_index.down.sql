-- Reverte 0010 — recria os 2 índices simples removidos e dropa o parcial.
DROP INDEX IF EXISTS "statement_import_jobs_reconciliation_idx";
--> statement-breakpoint

CREATE INDEX "merchant_category_memory_household_idx" ON "merchant_category_memory" USING btree ("household_id");
--> statement-breakpoint

CREATE INDEX "statement_import_jobs_household_idx" ON "statement_import_jobs" USING btree ("household_id");
