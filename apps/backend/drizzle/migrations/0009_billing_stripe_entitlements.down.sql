-- ============================================================================
-- Rollback da 0009 — billing (ADR-0026).
--
-- Dropa a tabela `stripe_webhook_events` e as 6 colunas novas de
-- `subscriptions`. As linhas de backfill (free/active) NÃO são removidas —
-- ficam como linhas comuns, compatíveis com o shape anterior da tabela
-- (nenhuma coluna nova sobra "presa" nelas); não é destrutivo mantê-las, e
-- remover heuristicamente arriscaria apagar uma linha real criada por B-2
-- entre o `up` e um eventual `down`.
-- ============================================================================

DROP TABLE IF EXISTS "stripe_webhook_events";
--> statement-breakpoint
ALTER TABLE "subscriptions" DROP CONSTRAINT IF EXISTS "subscriptions_comp_granted_by_users_id_fk";
--> statement-breakpoint
ALTER TABLE "subscriptions" DROP COLUMN IF EXISTS "comp_expires_at";
--> statement-breakpoint
ALTER TABLE "subscriptions" DROP COLUMN IF EXISTS "comp_granted_by";
--> statement-breakpoint
ALTER TABLE "subscriptions" DROP COLUMN IF EXISTS "comp_reason";
--> statement-breakpoint
ALTER TABLE "subscriptions" DROP COLUMN IF EXISTS "discount_percent";
--> statement-breakpoint
ALTER TABLE "subscriptions" DROP COLUMN IF EXISTS "stripe_coupon_id";
--> statement-breakpoint
ALTER TABLE "subscriptions" DROP COLUMN IF EXISTS "stripe_price_id";
