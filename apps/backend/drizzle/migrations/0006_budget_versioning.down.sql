-- ============================================================================
-- Rollback da 0006 — volta `budgets` ao modelo linha-por-mês e dropa
-- `budget_versions`.
--
-- IRRECUPERÁVEL no rollback (mesma decisão do kickoff M10): os limites
-- versionados NÃO são convertidos de volta em linhas mês-a-mês — não há
-- forma correta de "desfazer" a herança automática em snapshots discretos
-- sem inventar dados. `month`/`year`/`amount_cents` voltam a existir vazios
-- (NULL) até serem preenchidos manualmente.
-- ============================================================================

DROP TABLE IF EXISTS "budget_versions" CASCADE;
--> statement-breakpoint

DROP INDEX IF EXISTS "budgets_open_series_unique";
--> statement-breakpoint
DROP INDEX IF EXISTS "budgets_household_category_idx";
--> statement-breakpoint

ALTER TABLE "budgets" ADD COLUMN "amount_cents" integer;
--> statement-breakpoint
ALTER TABLE "budgets" ADD COLUMN "month" integer;
--> statement-breakpoint
ALTER TABLE "budgets" ADD COLUMN "year" integer;
--> statement-breakpoint
ALTER TABLE "budgets" DROP COLUMN "ended_from";
--> statement-breakpoint

CREATE INDEX "budgets_household_period_idx" ON "budgets" USING btree ("household_id","year","month");
