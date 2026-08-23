-- Achado do database-guardian sobre 0007/0008 (já aplicadas, não editáveis):
-- (1) statement_import_jobs_household_idx e merchant_category_memory_household_idx
--     são redundantes — cobertos pelo prefixo esquerdo de índices compostos/
--     únicos já existentes na mesma tabela.
-- (2) falta índice pra a query de reconciliação do cron (jobs pending/processing
--     além do deadline) — essa query NÃO filtra por household_id (é scan admin
--     cross-tenant via DRIZZLE_ADMIN), então (household_id, status) não serve de
--     prefixo útil. Índice parcial em (status, created_at) resolve.
DROP INDEX IF EXISTS "statement_import_jobs_household_idx";
--> statement-breakpoint

DROP INDEX IF EXISTS "merchant_category_memory_household_idx";
--> statement-breakpoint

CREATE INDEX "statement_import_jobs_reconciliation_idx" ON "statement_import_jobs" USING btree ("status", "created_at") WHERE "status" IN ('pending', 'processing');
