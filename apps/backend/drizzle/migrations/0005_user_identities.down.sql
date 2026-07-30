-- Reverte 0005 — remove user_identities por completo (tabela nova sem
-- consumidores neste ponto do plano; nenhum outro código lê/escreve nela
-- ainda). Não precisa reverter o backfill, a tabela inteira some.
DROP POLICY IF EXISTS "user_identities_select" ON public.user_identities;
--> statement-breakpoint
ALTER TABLE public.user_identities DISABLE ROW LEVEL SECURITY;
--> statement-breakpoint
REVOKE ALL ON public.user_identities FROM app_user;
--> statement-breakpoint
DROP TABLE IF EXISTS "user_identities";
--> statement-breakpoint
DROP TYPE IF EXISTS "public"."auth_provider";
