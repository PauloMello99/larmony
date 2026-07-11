-- ============================================================================
-- Rollback da 0008 — timezone + hora de notificação do lar (ADR-0024).
-- Reversível por completo: dropa as duas colunas novas.
-- ============================================================================

ALTER TABLE "households" DROP COLUMN IF EXISTS "notification_hour";
--> statement-breakpoint
ALTER TABLE "households" DROP COLUMN IF EXISTS "timezone";
