-- ============================================================================
-- 0009 — Billing: Stripe + entitlements + comp/desconto administrativo (M14, ADR-0026).
--
-- Estende `subscriptions` (shell existente, zero código de aplicação até
-- aqui) com colunas para desconto (via Stripe Coupon, criado/anexado pela
-- nossa própria API — cache local só para exibição) e isenção/comp (100%
-- local, nunca toca o Stripe). Nova tabela `stripe_webhook_events` para
-- idempotência do webhook (PK = event id do Stripe).
--
-- Backfill: households sem linha em `subscriptions` recebem free/active —
-- a tabela nunca teve nenhuma escrita de aplicação até aqui (shell puro, ver
-- ADR-0015/ADR-0026), então é seguro cobrir 100% dos households existentes
-- sem risco de conflito.
--
-- Migration custom escrita à mão (ver README). Roda em transação (migrator).
-- ============================================================================

-- ─── subscriptions: colunas de desconto/isenção ─────────────────────────────

ALTER TABLE "subscriptions" ADD COLUMN "stripe_price_id" text;
--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "stripe_coupon_id" text;
--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "discount_percent" smallint;
--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "comp_reason" text;
--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "comp_granted_by" uuid;
--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "comp_expires_at" timestamp with time zone;
--> statement-breakpoint

ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_comp_granted_by_users_id_fk"
  FOREIGN KEY ("comp_granted_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint

-- ─── stripe_webhook_events: idempotência do webhook ─────────────────────────

CREATE TABLE "stripe_webhook_events" (
	"id" text PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processed_at" timestamp with time zone
);
--> statement-breakpoint

-- Sem GRANT a app_user e sem RLS de propósito (mesmo padrão de
-- `notification_dedup`): só DRIZZLE_ADMIN (role postgres, BYPASSRLS) grava e
-- lê esta tabela — o webhook do Stripe roda fora de request context, sem
-- claims, e a ausência de GRANT já barra `app_user` antes do RLS ser avaliado.

-- ─── Backfill: households sem subscription recebem free/active ─────────────

INSERT INTO public.subscriptions (household_id, type, status)
SELECT h.id, 'free', 'active'
FROM public.households h
WHERE NOT EXISTS (
  SELECT 1 FROM public.subscriptions s WHERE s.household_id = h.id
);
