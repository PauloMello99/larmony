-- Reverte 0001_rls_policies: policies + RLS + helpers. A role app_user e os
-- GRANTs ficam (inofensivos e compartilháveis entre bancos do mesmo cluster).

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
