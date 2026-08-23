-- Reverte 0008 — dropa as policies explicitamente, depois as tabelas
-- (candidates antes de jobs, por causa da FK; RLS cai junto com a tabela)
-- e por último os 4 enums novos.
DROP POLICY IF EXISTS "statement_import_candidates_delete" ON public.statement_import_candidates;
--> statement-breakpoint
DROP POLICY IF EXISTS "statement_import_candidates_update" ON public.statement_import_candidates;
--> statement-breakpoint
DROP POLICY IF EXISTS "statement_import_candidates_insert" ON public.statement_import_candidates;
--> statement-breakpoint
DROP POLICY IF EXISTS "statement_import_candidates_select" ON public.statement_import_candidates;
--> statement-breakpoint
DROP POLICY IF EXISTS "statement_import_jobs_delete" ON public.statement_import_jobs;
--> statement-breakpoint
DROP POLICY IF EXISTS "statement_import_jobs_update" ON public.statement_import_jobs;
--> statement-breakpoint
DROP POLICY IF EXISTS "statement_import_jobs_insert" ON public.statement_import_jobs;
--> statement-breakpoint
DROP POLICY IF EXISTS "statement_import_jobs_select" ON public.statement_import_jobs;
--> statement-breakpoint
DROP TABLE IF EXISTS "statement_import_candidates";
--> statement-breakpoint
DROP TABLE IF EXISTS "statement_import_jobs";
--> statement-breakpoint
DROP TYPE IF EXISTS "public"."category_confidence";
--> statement-breakpoint
DROP TYPE IF EXISTS "public"."statement_import_candidate_status";
--> statement-breakpoint
DROP TYPE IF EXISTS "public"."statement_import_job_status";
--> statement-breakpoint
DROP TYPE IF EXISTS "public"."statement_import_source";
