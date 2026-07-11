-- ============================================================================
-- Rollback da 0007 — dropa as tabelas novas e o enum `notification_channel`.
--
-- IRRECUPERÁVEL no rollback (limitação do Postgres, não de design): não existe
-- `ALTER TYPE ... DROP VALUE` — os 3 valores adicionados a `notification_type`
-- ('auto_launch', 'budget_exceeded', 'monthly_report') PERMANECEM no enum após
-- o rollback. Isso é inofensivo (nenhuma linha os usa se as tabelas que os
-- referenciavam foram dropadas), só não é uma reversão limpa do tipo.
-- ============================================================================

DROP TABLE IF EXISTS "notification_dedup";
--> statement-breakpoint
DROP TABLE IF EXISTS "notification_preferences";
--> statement-breakpoint
DROP TYPE IF EXISTS "public"."notification_channel";
