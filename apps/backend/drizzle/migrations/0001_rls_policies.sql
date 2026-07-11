-- ============================================================================
-- 0001 — RLS baseline do Larmony (ADR-0005 + ADR-0015).
--
-- Helpers sobre auth.uid() (lê o claim `sub` de request.jwt.claims), role
-- `app_user` (LOGIN, NOBYPASSRLS) usada pelo backend em runtime (o RlsContext
-- faz set_config('request.jwt.claims', ...) por request), ENABLE RLS e
-- policies por tabela. `postgres`/`service_role` mantêm BYPASSRLS para
-- migrations e bootstrap.
--
-- notifications fica SEM RLS de propósito: acesso só pelo módulo de
-- notificações via DRIZZLE_ADMIN, sempre escopado por user_id no código.
-- ============================================================================

-- ─── Helpers ────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql SECURITY DEFINER STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE auth_id = auth.uid()
      AND platform_role = 'super_admin'
  )
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION public.is_household_member(p_household_id uuid)
RETURNS boolean
LANGUAGE sql SECURITY DEFINER STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.household_memberships hm
    JOIN public.users u ON u.id = hm.user_id
    WHERE u.auth_id = auth.uid()
      AND hm.household_id = p_household_id
  )
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION public.is_household_owner(p_household_id uuid)
RETURNS boolean
LANGUAGE sql SECURITY DEFINER STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.household_memberships hm
    JOIN public.users u ON u.id = hm.user_id
    WHERE u.auth_id = auth.uid()
      AND hm.household_id = p_household_id
      AND hm.role = 'owner'
  )
$$;
--> statement-breakpoint

-- ─── Role de runtime (NOBYPASSRLS) ─────────────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_user') THEN
    CREATE ROLE app_user LOGIN PASSWORD 'app_user_dev' NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
  END IF;
END $$;
--> statement-breakpoint
GRANT USAGE ON SCHEMA public TO app_user;
--> statement-breakpoint
GRANT USAGE ON SCHEMA auth TO app_user;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;
--> statement-breakpoint
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_user;
--> statement-breakpoint
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_user;
--> statement-breakpoint
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO app_user;
--> statement-breakpoint

-- ─── ENABLE RLS ─────────────────────────────────────────────────────────────

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE public.households ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE public.household_memberships ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE public.household_invitations ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE public.installment_groups ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE public.transaction_members ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE public.goal_contributions ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE public.bills ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

-- ─── users ──────────────────────────────────────────────────────────────────

CREATE POLICY "users_select" ON public.users
  FOR SELECT USING (auth.uid() = auth_id OR public.is_super_admin());
--> statement-breakpoint
CREATE POLICY "users_insert" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = auth_id);
--> statement-breakpoint
CREATE POLICY "users_update" ON public.users
  FOR UPDATE USING (auth.uid() = auth_id OR public.is_super_admin());
--> statement-breakpoint
CREATE POLICY "users_delete" ON public.users
  FOR DELETE USING (public.is_super_admin());
--> statement-breakpoint

-- ─── households ─────────────────────────────────────────────────────────────

CREATE POLICY "households_select" ON public.households
  FOR SELECT USING (public.is_super_admin() OR public.is_household_member(id));
--> statement-breakpoint
CREATE POLICY "households_insert" ON public.households
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
--> statement-breakpoint
CREATE POLICY "households_update" ON public.households
  FOR UPDATE USING (public.is_super_admin() OR public.is_household_owner(id));
--> statement-breakpoint
CREATE POLICY "households_delete" ON public.households
  FOR DELETE USING (public.is_super_admin() OR public.is_household_owner(id));
--> statement-breakpoint

-- ─── household_memberships ──────────────────────────────────────────────────

CREATE POLICY "household_memberships_select" ON public.household_memberships
  FOR SELECT USING (public.is_super_admin() OR public.is_household_member(household_id));
--> statement-breakpoint
CREATE POLICY "household_memberships_insert" ON public.household_memberships
  FOR INSERT WITH CHECK (public.is_super_admin() OR public.is_household_owner(household_id));
--> statement-breakpoint
CREATE POLICY "household_memberships_update" ON public.household_memberships
  FOR UPDATE USING (public.is_super_admin() OR public.is_household_owner(household_id));
--> statement-breakpoint
CREATE POLICY "household_memberships_delete" ON public.household_memberships
  FOR DELETE USING (public.is_super_admin() OR public.is_household_owner(household_id));
--> statement-breakpoint

-- ─── household_invitations ──────────────────────────────────────────────────

CREATE POLICY "household_invitations_select" ON public.household_invitations
  FOR SELECT USING (public.is_super_admin() OR public.is_household_member(household_id));
--> statement-breakpoint
CREATE POLICY "household_invitations_insert" ON public.household_invitations
  FOR INSERT WITH CHECK (public.is_super_admin() OR public.is_household_owner(household_id));
--> statement-breakpoint
CREATE POLICY "household_invitations_update" ON public.household_invitations
  FOR UPDATE USING (public.is_super_admin() OR public.is_household_owner(household_id));
--> statement-breakpoint
CREATE POLICY "household_invitations_delete" ON public.household_invitations
  FOR DELETE USING (public.is_super_admin() OR public.is_household_owner(household_id));
--> statement-breakpoint

-- ─── subscriptions (shell; gerenciadas pela plataforma) ────────────────────

CREATE POLICY "subscriptions_select" ON public.subscriptions
  FOR SELECT USING (public.is_super_admin() OR public.is_household_owner(household_id));
--> statement-breakpoint
CREATE POLICY "subscriptions_insert" ON public.subscriptions
  FOR INSERT WITH CHECK (public.is_super_admin());
--> statement-breakpoint
CREATE POLICY "subscriptions_update" ON public.subscriptions
  FOR UPDATE USING (public.is_super_admin());
--> statement-breakpoint
CREATE POLICY "subscriptions_delete" ON public.subscriptions
  FOR DELETE USING (public.is_super_admin());
--> statement-breakpoint

-- ─── audit_logs (leitura de plataforma; escrita via app) ───────────────────

CREATE POLICY "audit_logs_select" ON public.audit_logs
  FOR SELECT USING (public.is_super_admin());
--> statement-breakpoint
CREATE POLICY "audit_logs_insert" ON public.audit_logs
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
--> statement-breakpoint

-- ─── categories ─────────────────────────────────────────────────────────────

CREATE POLICY "categories_select" ON public.categories
  FOR SELECT USING (public.is_super_admin() OR public.is_household_member(household_id));
--> statement-breakpoint
CREATE POLICY "categories_insert" ON public.categories
  FOR INSERT WITH CHECK (public.is_super_admin() OR public.is_household_member(household_id));
--> statement-breakpoint
CREATE POLICY "categories_update" ON public.categories
  FOR UPDATE USING (public.is_super_admin() OR public.is_household_member(household_id));
--> statement-breakpoint
CREATE POLICY "categories_delete" ON public.categories
  FOR DELETE USING (public.is_super_admin() OR public.is_household_member(household_id));
--> statement-breakpoint

-- ─── installment_groups ─────────────────────────────────────────────────────

CREATE POLICY "installment_groups_select" ON public.installment_groups
  FOR SELECT USING (public.is_super_admin() OR public.is_household_member(household_id));
--> statement-breakpoint
CREATE POLICY "installment_groups_insert" ON public.installment_groups
  FOR INSERT WITH CHECK (public.is_super_admin() OR public.is_household_member(household_id));
--> statement-breakpoint
CREATE POLICY "installment_groups_update" ON public.installment_groups
  FOR UPDATE USING (public.is_super_admin() OR public.is_household_member(household_id));
--> statement-breakpoint
CREATE POLICY "installment_groups_delete" ON public.installment_groups
  FOR DELETE USING (public.is_super_admin() OR public.is_household_member(household_id));
--> statement-breakpoint

-- ─── transactions ───────────────────────────────────────────────────────────

CREATE POLICY "transactions_select" ON public.transactions
  FOR SELECT USING (public.is_super_admin() OR public.is_household_member(household_id));
--> statement-breakpoint
CREATE POLICY "transactions_insert" ON public.transactions
  FOR INSERT WITH CHECK (public.is_super_admin() OR public.is_household_member(household_id));
--> statement-breakpoint
CREATE POLICY "transactions_update" ON public.transactions
  FOR UPDATE USING (public.is_super_admin() OR public.is_household_member(household_id));
--> statement-breakpoint
CREATE POLICY "transactions_delete" ON public.transactions
  FOR DELETE USING (public.is_super_admin() OR public.is_household_member(household_id));
--> statement-breakpoint

-- ─── transaction_members (escopo via transaction pai) ──────────────────────

CREATE POLICY "transaction_members_select" ON public.transaction_members
  FOR SELECT USING (
    public.is_super_admin() OR EXISTS (
      SELECT 1 FROM public.transactions t
      WHERE t.id = transaction_id AND public.is_household_member(t.household_id)
    )
  );
--> statement-breakpoint
CREATE POLICY "transaction_members_insert" ON public.transaction_members
  FOR INSERT WITH CHECK (
    public.is_super_admin() OR EXISTS (
      SELECT 1 FROM public.transactions t
      WHERE t.id = transaction_id AND public.is_household_member(t.household_id)
    )
  );
--> statement-breakpoint
CREATE POLICY "transaction_members_update" ON public.transaction_members
  FOR UPDATE USING (
    public.is_super_admin() OR EXISTS (
      SELECT 1 FROM public.transactions t
      WHERE t.id = transaction_id AND public.is_household_member(t.household_id)
    )
  );
--> statement-breakpoint
CREATE POLICY "transaction_members_delete" ON public.transaction_members
  FOR DELETE USING (
    public.is_super_admin() OR EXISTS (
      SELECT 1 FROM public.transactions t
      WHERE t.id = transaction_id AND public.is_household_member(t.household_id)
    )
  );
--> statement-breakpoint

-- ─── goals ──────────────────────────────────────────────────────────────────

CREATE POLICY "goals_select" ON public.goals
  FOR SELECT USING (public.is_super_admin() OR public.is_household_member(household_id));
--> statement-breakpoint
CREATE POLICY "goals_insert" ON public.goals
  FOR INSERT WITH CHECK (public.is_super_admin() OR public.is_household_member(household_id));
--> statement-breakpoint
CREATE POLICY "goals_update" ON public.goals
  FOR UPDATE USING (public.is_super_admin() OR public.is_household_member(household_id));
--> statement-breakpoint
CREATE POLICY "goals_delete" ON public.goals
  FOR DELETE USING (public.is_super_admin() OR public.is_household_member(household_id));
--> statement-breakpoint

-- ─── goal_contributions (escopo via goal pai) ───────────────────────────────

CREATE POLICY "goal_contributions_select" ON public.goal_contributions
  FOR SELECT USING (
    public.is_super_admin() OR EXISTS (
      SELECT 1 FROM public.goals g
      WHERE g.id = goal_id AND public.is_household_member(g.household_id)
    )
  );
--> statement-breakpoint
CREATE POLICY "goal_contributions_insert" ON public.goal_contributions
  FOR INSERT WITH CHECK (
    public.is_super_admin() OR EXISTS (
      SELECT 1 FROM public.goals g
      WHERE g.id = goal_id AND public.is_household_member(g.household_id)
    )
  );
--> statement-breakpoint
CREATE POLICY "goal_contributions_update" ON public.goal_contributions
  FOR UPDATE USING (
    public.is_super_admin() OR EXISTS (
      SELECT 1 FROM public.goals g
      WHERE g.id = goal_id AND public.is_household_member(g.household_id)
    )
  );
--> statement-breakpoint
CREATE POLICY "goal_contributions_delete" ON public.goal_contributions
  FOR DELETE USING (
    public.is_super_admin() OR EXISTS (
      SELECT 1 FROM public.goals g
      WHERE g.id = goal_id AND public.is_household_member(g.household_id)
    )
  );
--> statement-breakpoint

-- ─── budgets ────────────────────────────────────────────────────────────────

CREATE POLICY "budgets_select" ON public.budgets
  FOR SELECT USING (public.is_super_admin() OR public.is_household_member(household_id));
--> statement-breakpoint
CREATE POLICY "budgets_insert" ON public.budgets
  FOR INSERT WITH CHECK (public.is_super_admin() OR public.is_household_member(household_id));
--> statement-breakpoint
CREATE POLICY "budgets_update" ON public.budgets
  FOR UPDATE USING (public.is_super_admin() OR public.is_household_member(household_id));
--> statement-breakpoint
CREATE POLICY "budgets_delete" ON public.budgets
  FOR DELETE USING (public.is_super_admin() OR public.is_household_member(household_id));
--> statement-breakpoint

-- ─── bills ──────────────────────────────────────────────────────────────────

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
