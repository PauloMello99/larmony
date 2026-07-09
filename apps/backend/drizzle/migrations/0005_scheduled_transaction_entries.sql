-- ============================================================================
-- 0005 — Lançamentos programados (ADR-0020, supersede ADR-0019).
--
-- Funde `bills` (definição estática + lembrete + lançamento manual) e
-- `recurrences` (geração automática via cron) numa única tabela
-- `scheduled_transaction_entries`, com eixo `posting_mode` (auto|manual).
-- Migra os dados das duas tabelas, renomeia a proveniência em transactions
-- (recurrence_id → scheduled_transaction_entry_id) e dropa as tabelas antigas.
--
-- Migration custom escrita à mão (ver README). Roda em transação (migrator),
-- então qualquer falha reverte tudo.
-- ============================================================================

CREATE TYPE "public"."scheduled_posting_mode" AS ENUM ('auto', 'manual');
--> statement-breakpoint

CREATE TABLE "scheduled_transaction_entries" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "household_id" uuid NOT NULL,
  "posting_mode" "public"."scheduled_posting_mode" NOT NULL,
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
  "next_run_date" date,
  "is_active" boolean DEFAULT true NOT NULL,
  "notes" text,
  "reminder_days_before" integer,
  "reminder_last_sent_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  -- Cursor existe SE E SOMENTE SE o modo é auto (defesa física: um scan sem
  -- filtro de posting_mode não consegue gerar de uma linha manual, pois
  -- `NULL <= today` é falso).
  CONSTRAINT "sched_cursor_matches_mode"
    CHECK (("posting_mode" = 'auto') = ("next_run_date" IS NOT NULL))
);
--> statement-breakpoint

ALTER TABLE "scheduled_transaction_entries" ADD CONSTRAINT "scheduled_transaction_entries_household_id_households_id_fk"
  FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "scheduled_transaction_entries" ADD CONSTRAINT "scheduled_transaction_entries_created_by_users_id_fk"
  FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "scheduled_transaction_entries" ADD CONSTRAINT "scheduled_transaction_entries_person_id_users_id_fk"
  FOREIGN KEY ("person_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "scheduled_transaction_entries" ADD CONSTRAINT "scheduled_transaction_entries_category_id_categories_id_fk"
  FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint

CREATE INDEX "sched_household_idx" ON "scheduled_transaction_entries" USING btree ("household_id");
--> statement-breakpoint
CREATE INDEX "sched_engine_due_idx" ON "scheduled_transaction_entries" USING btree ("posting_mode", "is_active", "next_run_date");
--> statement-breakpoint

GRANT SELECT, INSERT, UPDATE, DELETE ON public.scheduled_transaction_entries TO app_user;
--> statement-breakpoint

-- ─── RLS (member-scoped, espelha bills/recurrences) ─────────────────────────
ALTER TABLE public.scheduled_transaction_entries ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "scheduled_transaction_entries_select" ON public.scheduled_transaction_entries
  FOR SELECT USING (public.is_super_admin() OR public.is_household_member(household_id));
--> statement-breakpoint
CREATE POLICY "scheduled_transaction_entries_insert" ON public.scheduled_transaction_entries
  FOR INSERT WITH CHECK (public.is_super_admin() OR public.is_household_member(household_id));
--> statement-breakpoint
CREATE POLICY "scheduled_transaction_entries_update" ON public.scheduled_transaction_entries
  FOR UPDATE USING (public.is_super_admin() OR public.is_household_member(household_id));
--> statement-breakpoint
CREATE POLICY "scheduled_transaction_entries_delete" ON public.scheduled_transaction_entries
  FOR DELETE USING (public.is_super_admin() OR public.is_household_member(household_id));
--> statement-breakpoint

-- ─── Guarda: toda bill precisa de um membro do lar (created_by não-nulo) ─────
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.bills b
    WHERE NOT EXISTS (
      SELECT 1 FROM public.household_memberships hm WHERE hm.household_id = b.household_id
    )
  ) THEN
    RAISE EXCEPTION 'Migração 0005 abortada: existe bill em household sem nenhum membership (created_by ficaria nulo).';
  END IF;
END $$;
--> statement-breakpoint

-- ─── recurrences → entries (posting_mode=auto, PRESERVA id) ──────────────────
-- Preservar o id é o que torna o backfill de proveniência (abaixo) válido.
INSERT INTO public.scheduled_transaction_entries
  (id, household_id, posting_mode, created_by, person_id, category_id, type,
   amount_cents, description, frequency, interval, start_date, end_date,
   next_run_date, is_active, notes, reminder_days_before, reminder_last_sent_at,
   created_at, updated_at)
SELECT
  r.id, r.household_id, 'auto', r.created_by, r.person_id, r.category_id, r.type,
  r.amount_cents, r.description, r.frequency, r.interval, r.start_date, r.end_date,
  r.next_run_date, r.is_active, r.notes, NULL, NULL,
  r.created_at, r.updated_at
FROM public.recurrences r;
--> statement-breakpoint

-- ─── bills → entries (posting_mode=manual, type=expense, cadência mensal) ─────
-- start_date sintetizado ancorado em JANEIRO (31 dias) p/ preservar due_day 29–31;
-- o valor absoluto é irrelevante no modo manual — só o dia-do-mês importa.
-- created_by = owner do lar (fallback: membership mais antiga).
INSERT INTO public.scheduled_transaction_entries
  (household_id, posting_mode, created_by, person_id, category_id, type,
   amount_cents, description, frequency, interval, start_date, end_date,
   next_run_date, is_active, notes, reminder_days_before, reminder_last_sent_at,
   created_at, updated_at)
SELECT
  b.household_id,
  'manual',
  (SELECT hm.user_id FROM public.household_memberships hm
     WHERE hm.household_id = b.household_id
     ORDER BY (hm.role = 'owner') DESC, hm.joined_at ASC
     LIMIT 1),
  NULL,
  b.category_id,
  'expense',
  b.amount_cents,
  b.name,
  'monthly',
  1,
  make_date(EXTRACT(YEAR FROM now())::int, 1, b.due_day),
  NULL,
  NULL,
  b.is_active,
  b.notes,
  b.reminder_days_before,
  b.reminder_last_sent_at,
  b.created_at,
  b.updated_at
FROM public.bills b;
--> statement-breakpoint

-- ─── Proveniência: recurrence_id → scheduled_transaction_entry_id ────────────
ALTER TABLE "transactions" ADD COLUMN "scheduled_transaction_entry_id" uuid;
--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_scheduled_transaction_entry_id_fk"
  FOREIGN KEY ("scheduled_transaction_entry_id") REFERENCES "public"."scheduled_transaction_entries"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
-- Válido porque os ids das recurrences foram preservados acima.
UPDATE "transactions" SET "scheduled_transaction_entry_id" = "recurrence_id"
  WHERE "recurrence_id" IS NOT NULL;
--> statement-breakpoint

-- ─── Drop da proveniência antiga (ANTES de dropar recurrences: dependência FK) ─
ALTER TABLE "transactions" DROP CONSTRAINT IF EXISTS "transactions_recurrence_id_recurrences_id_fk";
--> statement-breakpoint
ALTER TABLE "transactions" DROP COLUMN IF EXISTS "recurrence_id";
--> statement-breakpoint

-- ─── Drop das tabelas antigas ────────────────────────────────────────────────
DROP TABLE IF EXISTS "bills";
--> statement-breakpoint
DROP TABLE IF EXISTS "recurrences";
--> statement-breakpoint
-- Enum recurrence_frequency é REUSADO pela nova tabela → NÃO dropar.
-- transaction_type também segue em uso.
