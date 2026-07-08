-- Rollback da 0004 — Co-membros podem ler `users` uns dos outros (RLS).
DROP POLICY IF EXISTS "users_select_household_peers" ON public.users;
--> statement-breakpoint
DROP FUNCTION IF EXISTS public.shares_household_with(uuid);
