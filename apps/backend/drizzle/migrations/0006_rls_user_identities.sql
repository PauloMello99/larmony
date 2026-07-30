-- Reescreve as 4 funções RLS + policies de users/notification_preferences
-- pra resolver identidade via user_identities em vez de users.auth_id
-- direto (adendo ADR-0032, múltiplas identidades por usuário). Este passo
-- é comportamentalmente NO-OP: todo usuário hoje tem exatamente 1
-- identidade == users.auth_id (backfill da migration 0005), então o
-- resultado de cada função/policy não muda — só a query interna.
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql SECURITY DEFINER STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users u
    JOIN public.user_identities ui ON ui.user_id = u.id
    WHERE ui.auth_id = auth.uid()
      AND u.platform_role = 'super_admin'
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
    JOIN public.user_identities ui ON ui.user_id = u.id
    WHERE ui.auth_id = auth.uid()
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
    JOIN public.user_identities ui ON ui.user_id = u.id
    WHERE ui.auth_id = auth.uid()
      AND hm.household_id = p_household_id
      AND hm.role = 'owner'
  )
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION public.shares_household_with(p_user_id uuid)
RETURNS boolean
LANGUAGE sql SECURITY DEFINER STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.household_memberships hm_self
    JOIN public.users u ON u.id = hm_self.user_id
    JOIN public.user_identities ui ON ui.user_id = u.id AND ui.auth_id = auth.uid()
    JOIN public.household_memberships hm_other
      ON hm_other.household_id = hm_self.household_id
    WHERE hm_other.user_id = p_user_id
  )
$$;
--> statement-breakpoint
DROP POLICY "users_select" ON public.users;
--> statement-breakpoint
CREATE POLICY "users_select" ON public.users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_identities ui
      WHERE ui.user_id = users.id AND ui.auth_id = auth.uid()
    )
    OR public.is_super_admin()
  );
--> statement-breakpoint
DROP POLICY "users_update" ON public.users;
--> statement-breakpoint
CREATE POLICY "users_update" ON public.users
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.user_identities ui
      WHERE ui.user_id = users.id AND ui.auth_id = auth.uid()
    )
    OR public.is_super_admin()
  );
--> statement-breakpoint
-- users_insert e users_delete NÃO mudam: users_insert (`auth.uid() = auth_id`)
-- só é exercida por DrizzleUserRepository.create(), que roda em
-- DRIZZLE_ADMIN (bypassa RLS); users_delete só usa is_super_admin(), já
-- corrigida acima.
DROP POLICY "notification_preferences_select" ON public.notification_preferences;
--> statement-breakpoint
CREATE POLICY "notification_preferences_select" ON public.notification_preferences
  FOR SELECT USING (
    public.is_super_admin() OR EXISTS (
      SELECT 1 FROM public.user_identities ui
      WHERE ui.user_id = notification_preferences.user_id AND ui.auth_id = auth.uid()
    )
  );
--> statement-breakpoint
DROP POLICY "notification_preferences_insert" ON public.notification_preferences;
--> statement-breakpoint
CREATE POLICY "notification_preferences_insert" ON public.notification_preferences
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_identities ui
      WHERE ui.user_id = notification_preferences.user_id AND ui.auth_id = auth.uid()
    )
  );
--> statement-breakpoint
DROP POLICY "notification_preferences_update" ON public.notification_preferences;
--> statement-breakpoint
CREATE POLICY "notification_preferences_update" ON public.notification_preferences
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.user_identities ui
      WHERE ui.user_id = notification_preferences.user_id AND ui.auth_id = auth.uid()
    )
  );
--> statement-breakpoint
DROP POLICY "notification_preferences_delete" ON public.notification_preferences;
--> statement-breakpoint
CREATE POLICY "notification_preferences_delete" ON public.notification_preferences
  FOR DELETE USING (
    public.is_super_admin() OR EXISTS (
      SELECT 1 FROM public.user_identities ui
      WHERE ui.user_id = notification_preferences.user_id AND ui.auth_id = auth.uid()
    )
  );
