-- Rollback do 0000_baseline: downs da cadeia original em ordem REVERSA.

-- ORIGEM: 0011_terms_consent.down.sql
-- Rollback da 0011 â€” remove as colunas de aceite de termos.
ALTER TABLE "users" DROP COLUMN IF EXISTS "terms_accepted_at";
ALTER TABLE "users" DROP COLUMN IF EXISTS "terms_version";

-- ORIGEM: 0010_billing_plan_catalog.down.sql
-- ============================================================================
-- Rollback da 0010 â€” dropa a tabela `billing_plans`.
-- ============================================================================

DROP TABLE IF EXISTS "billing_plans";

-- ORIGEM: 0009_billing_stripe_entitlements.down.sql
-- ============================================================================
-- Rollback da 0009 â€” billing (ADR-0026).
--
-- Dropa a tabela `stripe_webhook_events` e as 6 colunas novas de
-- `subscriptions`. As linhas de backfill (free/active) NÃƒO sÃ£o removidas â€”
-- ficam como linhas comuns, compatÃ­veis com o shape anterior da tabela
-- (nenhuma coluna nova sobra "presa" nelas); nÃ£o Ã© destrutivo mantÃª-las, e
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

-- ORIGEM: 0008_household_timezone.down.sql
-- ============================================================================
-- Rollback da 0008 â€” timezone + hora de notificaÃ§Ã£o do lar (ADR-0024).
-- ReversÃ­vel por completo: dropa as duas colunas novas.
-- ============================================================================

ALTER TABLE "households" DROP COLUMN IF EXISTS "notification_hour";
--> statement-breakpoint
ALTER TABLE "households" DROP COLUMN IF EXISTS "timezone";

-- ORIGEM: 0007_notification_dispatcher.down.sql
-- ============================================================================
-- Rollback da 0007 â€” dropa as tabelas novas e o enum `notification_channel`.
--
-- IRRECUPERÃVEL no rollback (limitaÃ§Ã£o do Postgres, nÃ£o de design): nÃ£o existe
-- `ALTER TYPE ... DROP VALUE` â€” os 3 valores adicionados a `notification_type`
-- ('auto_launch', 'budget_exceeded', 'monthly_report') PERMANECEM no enum apÃ³s
-- o rollback. Isso Ã© inofensivo (nenhuma linha os usa se as tabelas que os
-- referenciavam foram dropadas), sÃ³ nÃ£o Ã© uma reversÃ£o limpa do tipo.
-- ============================================================================

DROP TABLE IF EXISTS "notification_dedup";
--> statement-breakpoint
DROP TABLE IF EXISTS "notification_preferences";
--> statement-breakpoint
DROP TYPE IF EXISTS "public"."notification_channel";

-- ORIGEM: 0006_budget_versioning.down.sql
-- ============================================================================
-- Rollback da 0006 â€” volta `budgets` ao modelo linha-por-mÃªs e dropa
-- `budget_versions`.
--
-- IRRECUPERÃVEL no rollback (mesma decisÃ£o do kickoff M10): os limites
-- versionados NÃƒO sÃ£o convertidos de volta em linhas mÃªs-a-mÃªs â€” nÃ£o hÃ¡
-- forma correta de "desfazer" a heranÃ§a automÃ¡tica em snapshots discretos
-- sem inventar dados. `month`/`year`/`amount_cents` voltam a existir vazios
-- (NULL) atÃ© serem preenchidos manualmente.
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

-- ORIGEM: 0005_scheduled_transaction_entries.down.sql
-- ============================================================================
-- Rollback da 0005 â€” recria bills + recurrences a partir de
-- scheduled_transaction_entries. BEST-EFFORT (merge destrutivo):
--
-- IRRECUPERÃVEL no rollback (documentado): entries `manual` que NÃƒO cabem no
-- shape antigo de bills â€” type=income, frequency weekly/yearly, ou com person_id
-- â€” sÃ£o DESCARTADAS (bills Ã© expense-only e mensal-implÃ­cito). Entries `auto`
-- round-trip integralmente para recurrences (ids preservados).
-- ============================================================================

-- â”€â”€â”€ Recria recurrences (espelha 0002) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CREATE TABLE "recurrences" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "household_id" uuid NOT NULL,
  "created_by" uuid NOT NULL,
  "person_id" uuid,
  "category_id" uuid,
  "type" "public"."transaction_type" NOT NULL,
  "amount_cents" integer NOT NULL,
  "description" text NOT NULL,
  "frequency" "public"."recurrence_frequency" NOT NULL,
  "interval" integer DEFAULT 1 NOT NULL,
  "start_date" date NOT NULL,
  "end_date" date,
  "next_run_date" date NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "notes" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "recurrences" ADD CONSTRAINT "recurrences_household_id_households_id_fk"
  FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "recurrences" ADD CONSTRAINT "recurrences_created_by_users_id_fk"
  FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "recurrences" ADD CONSTRAINT "recurrences_person_id_users_id_fk"
  FOREIGN KEY ("person_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "recurrences" ADD CONSTRAINT "recurrences_category_id_categories_id_fk"
  FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "recurrences_household_idx" ON "recurrences" USING btree ("household_id");
--> statement-breakpoint
CREATE INDEX "recurrences_due_idx" ON "recurrences" USING btree ("is_active", "next_run_date");
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recurrences TO app_user;
--> statement-breakpoint
ALTER TABLE public.recurrences ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "recurrences_select" ON public.recurrences
  FOR SELECT USING (public.is_super_admin() OR public.is_household_member(household_id));
--> statement-breakpoint
CREATE POLICY "recurrences_insert" ON public.recurrences
  FOR INSERT WITH CHECK (public.is_super_admin() OR public.is_household_member(household_id));
--> statement-breakpoint
CREATE POLICY "recurrences_update" ON public.recurrences
  FOR UPDATE USING (public.is_super_admin() OR public.is_household_member(household_id));
--> statement-breakpoint
CREATE POLICY "recurrences_delete" ON public.recurrences
  FOR DELETE USING (public.is_super_admin() OR public.is_household_member(household_id));
--> statement-breakpoint

-- auto entries â†’ recurrences (preserva id p/ backfill de proveniÃªncia)
INSERT INTO public.recurrences
  (id, household_id, created_by, person_id, category_id, type, amount_cents,
   description, frequency, interval, start_date, end_date, next_run_date,
   is_active, notes, created_at, updated_at)
SELECT
  e.id, e.household_id, e.created_by, e.person_id, e.category_id, e.type, e.amount_cents,
  e.description, e.frequency, e.interval, e.start_date, e.end_date, e.next_run_date,
  e.is_active, e.notes, e.created_at, e.updated_at
FROM public.scheduled_transaction_entries e
WHERE e.posting_mode = 'auto';
--> statement-breakpoint

-- â”€â”€â”€ Recria bills (espelha 0000 + RLS 0001) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CREATE TABLE "bills" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "household_id" uuid NOT NULL,
  "category_id" uuid,
  "name" text NOT NULL,
  "amount_cents" integer NOT NULL,
  "due_day" integer NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "notes" text,
  "reminder_days_before" integer,
  "reminder_last_sent_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bills" ADD CONSTRAINT "bills_household_id_households_id_fk"
  FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "bills" ADD CONSTRAINT "bills_category_id_categories_id_fk"
  FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "bills_household_idx" ON "bills" USING btree ("household_id");
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bills TO app_user;
--> statement-breakpoint
ALTER TABLE public.bills ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "bills_select" ON public.bills
  FOR SELECT USING (public.is_super_admin() OR public.is_household_member(household_id));
--> statement-breakpoint
CREATE POLICY "bills_insert" ON public.bills
  FOR INSERT WITH CHECK (public.is_super_admin() OR public.is_household_member(household_id));
--> statement-breakpoint
CREATE POLICY "bills_update" ON public.bills
  FOR UPDATE USING (public.is_super_admin() OR public.is_household_member(household_id));
--> statement-breakpoint
CREATE POLICY "bills_delete" ON public.bills
  FOR DELETE USING (public.is_super_admin() OR public.is_household_member(household_id));
--> statement-breakpoint

-- manual + expense entries â†’ bills (due_day = dia do start_date). Entries manuais
-- income/weekly/yearly NÃƒO cabem e sÃ£o descartadas (ver header).
INSERT INTO public.bills
  (household_id, category_id, name, amount_cents, due_day, is_active, notes,
   reminder_days_before, reminder_last_sent_at, created_at, updated_at)
SELECT
  e.household_id, e.category_id, e.description, e.amount_cents,
  EXTRACT(DAY FROM e.start_date)::int, e.is_active, e.notes,
  e.reminder_days_before, e.reminder_last_sent_at, e.created_at, e.updated_at
FROM public.scheduled_transaction_entries e
WHERE e.posting_mode = 'manual' AND e.type = 'expense' AND e.frequency = 'monthly';
--> statement-breakpoint

-- â”€â”€â”€ ProveniÃªncia: scheduled_transaction_entry_id â†’ recurrence_id â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
ALTER TABLE "transactions" ADD COLUMN "recurrence_id" uuid;
--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_recurrence_id_recurrences_id_fk"
  FOREIGN KEY ("recurrence_id") REFERENCES "public"."recurrences"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
UPDATE "transactions" t SET "recurrence_id" = t."scheduled_transaction_entry_id"
  FROM public.scheduled_transaction_entries e
  WHERE e.id = t."scheduled_transaction_entry_id" AND e.posting_mode = 'auto';
--> statement-breakpoint

ALTER TABLE "transactions" DROP CONSTRAINT IF EXISTS "transactions_scheduled_transaction_entry_id_fk";
--> statement-breakpoint
ALTER TABLE "transactions" DROP COLUMN IF EXISTS "scheduled_transaction_entry_id";
--> statement-breakpoint
DROP TABLE IF EXISTS "scheduled_transaction_entries";
--> statement-breakpoint
DROP TYPE IF EXISTS "public"."scheduled_posting_mode";

-- ORIGEM: 0004_users_select_household_peers.down.sql
-- Rollback da 0004 â€” Co-membros podem ler `users` uns dos outros (RLS).
DROP POLICY IF EXISTS "users_select_household_peers" ON public.users;
--> statement-breakpoint
DROP FUNCTION IF EXISTS public.shares_household_with(uuid);

-- ORIGEM: 0003_user_onboarding.down.sql
ALTER TABLE "users" DROP COLUMN "onboarding";

-- ORIGEM: 0002_recurrences.down.sql
-- Rollback da 0002 â€” RecorrÃªncia (M9).
ALTER TABLE "transactions" DROP CONSTRAINT IF EXISTS "transactions_recurrence_id_recurrences_id_fk";
--> statement-breakpoint
ALTER TABLE "transactions" DROP COLUMN IF EXISTS "recurrence_id";
--> statement-breakpoint
DROP TABLE IF EXISTS "recurrences";
--> statement-breakpoint
DROP TYPE IF EXISTS "public"."recurrence_frequency";

-- ORIGEM: 0001_rls_policies.down.sql
-- Reverte 0001_rls_policies: policies + RLS + helpers. A role app_user e os
-- GRANTs ficam (inofensivos e compartilhÃ¡veis entre bancos do mesmo cluster).

DO $$
DECLARE
  t text;
  p record;
BEGIN
  FOR t IN
    SELECT unnest(ARRAY[
      'users','households','household_memberships','household_invitations',
      'subscriptions','audit_logs','categories','installment_groups',
      'transactions','transaction_members','goals','goal_contributions',
      'budgets','bills'
    ])
  LOOP
    FOR p IN
      SELECT policyname FROM pg_policies
      WHERE schemaname = 'public' AND tablename = t
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', p.policyname, t);
    END LOOP;
    EXECUTE format('ALTER TABLE public.%I DISABLE ROW LEVEL SECURITY', t);
  END LOOP;
END $$;

DROP FUNCTION IF EXISTS public.is_household_owner(uuid);
DROP FUNCTION IF EXISTS public.is_household_member(uuid);
DROP FUNCTION IF EXISTS public.is_super_admin();

-- ORIGEM: 0000_nifty_squadron_sinister.down.sql
-- Reverte o baseline 0000: derruba todas as tabelas e enums do Larmony.
DROP TABLE IF EXISTS public.transaction_members CASCADE;
DROP TABLE IF EXISTS public.goal_contributions CASCADE;
DROP TABLE IF EXISTS public.bills CASCADE;
DROP TABLE IF EXISTS public.budgets CASCADE;
DROP TABLE IF EXISTS public.goals CASCADE;
DROP TABLE IF EXISTS public.transactions CASCADE;
DROP TABLE IF EXISTS public.installment_groups CASCADE;
DROP TABLE IF EXISTS public.categories CASCADE;
DROP TABLE IF EXISTS public.notifications CASCADE;
DROP TABLE IF EXISTS public.audit_logs CASCADE;
DROP TABLE IF EXISTS public.subscriptions CASCADE;
DROP TABLE IF EXISTS public.household_invitations CASCADE;
DROP TABLE IF EXISTS public.household_memberships CASCADE;
DROP TABLE IF EXISTS public.households CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

DROP TYPE IF EXISTS public.audit_action;
DROP TYPE IF EXISTS public.notification_type;
DROP TYPE IF EXISTS public.gender;
DROP TYPE IF EXISTS public.category_type;
DROP TYPE IF EXISTS public.transaction_type;
DROP TYPE IF EXISTS public.billing_interval;
DROP TYPE IF EXISTS public.subscription_status;
DROP TYPE IF EXISTS public.subscription_type;
DROP TYPE IF EXISTS public.invitation_status;
DROP TYPE IF EXISTS public.household_role;
DROP TYPE IF EXISTS public.platform_role;