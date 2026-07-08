-- ============================================================================
-- 0002 — Recorrência (M9). Regra de recorrência que gera transações
-- automaticamente no tick do cron (recurrence-engine). Migration custom escrita
-- à mão (ver README: da 0002 em diante não há snapshot do drizzle-kit).
--
-- Inclui: enum recurrence_frequency, tabela recurrences (+ índices, grants, RLS
-- member-scoped espelhando bills) e a coluna transactions.recurrence_id.
-- ============================================================================

CREATE TYPE "public"."recurrence_frequency" AS ENUM ('weekly', 'monthly', 'yearly');
--> statement-breakpoint

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

ALTER TABLE "transactions" ADD COLUMN "recurrence_id" uuid;
--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_recurrence_id_recurrences_id_fk"
  FOREIGN KEY ("recurrence_id") REFERENCES "public"."recurrences"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint

-- Grant explícito (a tabela nova herdaria via ALTER DEFAULT PRIVILEGES da 0001,
-- mas mantemos explícito para clareza e robustez).
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recurrences TO app_user;
--> statement-breakpoint

-- ─── RLS (member-scoped, espelha bills) ─────────────────────────────────────
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
