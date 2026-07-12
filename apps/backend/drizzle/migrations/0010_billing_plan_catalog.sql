-- ============================================================================
-- 0010 — Catálogo de planos (produtos/preços) espelhado com o Stripe (M14).
--
-- `billing_plans`: referência local dos planos que o produto vende (hoje só
-- "Larmony Premium" mensal). O catálogo é declarado em código
-- (`subscriptions/domain/plan-catalog.ts`) e sincronizado com o Stripe no
-- boot (`PlanCatalogService`, OnModuleInit) — o Stripe é a fonte de verdade
-- de existência (via `lookup_key` do Price), esta tabela é só um cache local
-- rápido para os use-cases não precisarem chamar o Stripe a cada checkout.
--
-- Sem GRANT a app_user e sem RLS de propósito (mesmo padrão de
-- `stripe_webhook_events`/`notification_dedup`): é config de plataforma, só
-- DRIZZLE_ADMIN toca.
--
-- Migration custom escrita à mão (ver README). Roda em transação (migrator).
-- ============================================================================

CREATE TABLE "billing_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"stripe_product_id" text,
	"stripe_price_id" text,
	"name" text NOT NULL,
	"amount_cents" integer NOT NULL,
	"currency" text NOT NULL,
	"interval" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"last_synced_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "billing_plans_key_unique" UNIQUE("key")
);
