-- Débito da Fase 1 do import de extrato (ADR-0034): tabelas de job e
-- staging de candidatos. Arquivo bruto NÃO é persistido (minimização de
-- dado) — só o resultado do callback do processor Python. RLS
-- household-scoped, mesmo padrão de "categories" (0000_baseline) e
-- "merchant_category_memory" (0007).
CREATE TYPE "public"."statement_import_source" AS ENUM ('csv', 'ofx', 'pdf');
--> statement-breakpoint

CREATE TYPE "public"."statement_import_job_status" AS ENUM ('pending', 'processing', 'completed', 'failed');
--> statement-breakpoint

-- "duplicate" fica reservado/inalcançável nesta fase — ver comentário no
-- schema TS (statement-import-candidates.ts).
CREATE TYPE "public"."statement_import_candidate_status" AS ENUM ('pending_review', 'confirmed', 'dismissed', 'duplicate');
--> statement-breakpoint

CREATE TYPE "public"."category_confidence" AS ENUM ('high', 'medium', 'low');
--> statement-breakpoint

CREATE TABLE "statement_import_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"household_id" uuid NOT NULL,
	"created_by" uuid NOT NULL,
	"source" "statement_import_source" NOT NULL,
	"status" "statement_import_job_status" DEFAULT 'pending' NOT NULL,
	"error_code" text,
	"error_message" text,
	"stats" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint

CREATE TABLE "statement_import_candidates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" uuid NOT NULL,
	"household_id" uuid NOT NULL,
	"external_id" text NOT NULL,
	"date" date NOT NULL,
	"amount_cents" integer NOT NULL,
	"type" "transaction_type" NOT NULL,
	"description" text NOT NULL,
	"category_id" uuid,
	"category_confidence" "category_confidence",
	"resolved_by" text NOT NULL,
	"merchant_key" text,
	"status" "statement_import_candidate_status" DEFAULT 'pending_review' NOT NULL,
	"transaction_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "statement_import_candidates_household_id_external_id_unique" UNIQUE("household_id","external_id")
);
--> statement-breakpoint

ALTER TABLE "statement_import_jobs" ADD CONSTRAINT "statement_import_jobs_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "statement_import_jobs" ADD CONSTRAINT "statement_import_jobs_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "statement_import_candidates" ADD CONSTRAINT "statement_import_candidates_job_id_statement_import_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."statement_import_jobs"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "statement_import_candidates" ADD CONSTRAINT "statement_import_candidates_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "statement_import_candidates" ADD CONSTRAINT "statement_import_candidates_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "statement_import_candidates" ADD CONSTRAINT "statement_import_candidates_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint

CREATE INDEX "statement_import_jobs_household_idx" ON "statement_import_jobs" USING btree ("household_id");
--> statement-breakpoint

CREATE INDEX "statement_import_jobs_household_status_idx" ON "statement_import_jobs" USING btree ("household_id","status");
--> statement-breakpoint

CREATE INDEX "statement_import_candidates_job_idx" ON "statement_import_candidates" USING btree ("job_id");
--> statement-breakpoint

CREATE INDEX "statement_import_candidates_household_status_idx" ON "statement_import_candidates" USING btree ("household_id","status");
--> statement-breakpoint

ALTER TABLE public.statement_import_jobs ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

ALTER TABLE public.statement_import_candidates ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

CREATE POLICY "statement_import_jobs_select" ON public.statement_import_jobs
  FOR SELECT USING (public.is_super_admin() OR public.is_household_member(household_id));
--> statement-breakpoint
CREATE POLICY "statement_import_jobs_insert" ON public.statement_import_jobs
  FOR INSERT WITH CHECK (public.is_super_admin() OR public.is_household_member(household_id));
--> statement-breakpoint
CREATE POLICY "statement_import_jobs_update" ON public.statement_import_jobs
  FOR UPDATE USING (public.is_super_admin() OR public.is_household_member(household_id));
--> statement-breakpoint
CREATE POLICY "statement_import_jobs_delete" ON public.statement_import_jobs
  FOR DELETE USING (public.is_super_admin() OR public.is_household_member(household_id));
--> statement-breakpoint

CREATE POLICY "statement_import_candidates_select" ON public.statement_import_candidates
  FOR SELECT USING (public.is_super_admin() OR public.is_household_member(household_id));
--> statement-breakpoint
CREATE POLICY "statement_import_candidates_insert" ON public.statement_import_candidates
  FOR INSERT WITH CHECK (public.is_super_admin() OR public.is_household_member(household_id));
--> statement-breakpoint
CREATE POLICY "statement_import_candidates_update" ON public.statement_import_candidates
  FOR UPDATE USING (public.is_super_admin() OR public.is_household_member(household_id));
--> statement-breakpoint
CREATE POLICY "statement_import_candidates_delete" ON public.statement_import_candidates
  FOR DELETE USING (public.is_super_admin() OR public.is_household_member(household_id));
