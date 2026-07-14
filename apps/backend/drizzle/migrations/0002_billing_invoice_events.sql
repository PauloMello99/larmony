-- ============================================================================
-- Espelho mínimo de eventos de fatura do Stripe (M15 PR2). Alimenta os KPIs
-- reais de receita/falha de pagamento no admin sem persistir dado sensível:
-- SEM line items, SEM dado de cartão/payment method — só o essencial pra
-- contar dinheiro (id, lar, tipo, valor, moeda, quando). Mesma decisão de
-- minimização já aplicada em `stripe_webhook_events` (ADR-0026).
--
-- `unique(stripe_invoice_id, type)` é a chave de idempotência do webhook:
-- o Stripe pode reentregar o mesmo evento — upsert-ignore nessa constraint.
--
-- Sem GRANT a app_user e sem RLS de propósito (mesmo padrão de
-- `stripe_webhook_events`/`notification_dedup`): só DRIZZLE_ADMIN toca — o
-- webhook roda fora de request context, sem claims de usuário.
--
-- Migration custom escrita à mão (ver README). Roda em transação (migrator).
-- ============================================================================

CREATE TYPE "public"."billing_invoice_event_type" AS ENUM ('paid', 'payment_failed');
--> statement-breakpoint

CREATE TABLE "billing_invoice_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"stripe_invoice_id" text NOT NULL,
	"household_id" uuid,
	"type" "billing_invoice_event_type" NOT NULL,
	"amount_cents" integer NOT NULL,
	"currency" text NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "billing_invoice_events_invoice_type_unique" UNIQUE("stripe_invoice_id", "type")
);
--> statement-breakpoint

ALTER TABLE "billing_invoice_events" ADD CONSTRAINT "billing_invoice_events_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint

CREATE INDEX "billing_invoice_events_occurred_at_idx" ON "billing_invoice_events" USING btree ("occurred_at");
