-- ============================================================================
-- Rollback da 0005 — recria bills + recurrences a partir de
-- scheduled_transaction_entries. BEST-EFFORT (merge destrutivo):
--
-- IRRECUPERÁVEL no rollback (documentado): entries `manual` que NÃO cabem no
-- shape antigo de bills — type=income, frequency weekly/yearly, ou com person_id
-- — são DESCARTADAS (bills é expense-only e mensal-implícito). Entries `auto`
-- round-trip integralmente para recurrences (ids preservados).
-- ============================================================================

-- ─── Recria recurrences (espelha 0002) ──────────────────────────────────────
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

-- auto entries → recurrences (preserva id p/ backfill de proveniência)
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

-- ─── Recria bills (espelha 0000 + RLS 0001) ─────────────────────────────────
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

-- manual + expense entries → bills (due_day = dia do start_date). Entries manuais
-- income/weekly/yearly NÃO cabem e são descartadas (ver header).
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

-- ─── Proveniência: scheduled_transaction_entry_id → recurrence_id ────────────
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
