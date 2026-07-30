-- Reverte 0006 — restaura as 4 funções RLS e as policies de
-- users/notification_preferences pra resolver identidade via
-- users.auth_id direto (pré multiplas-identidades).
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
CREATE OR REPLACE FUNCTION public.shares_household_with(p_user_id uuid)
RETURNS boolean
LANGUAGE sql SECURITY DEFINER STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.household_memberships hm_self
    JOIN public.users u ON u.id = hm_self.user_id AND u.auth_id = auth.uid()
    JOIN public.household_memberships hm_other
      ON hm_other.household_id = hm_self.household_id
    WHERE hm_other.user_id = p_user_id
  )
$$;
--> statement-breakpoint
DROP POLICY "users_select" ON public.users;
--> statement-breakpoint
CREATE POLICY "users_select" ON public.users
  FOR SELECT USING (auth.uid() = auth_id OR public.is_super_admin());
--> statement-breakpoint
DROP POLICY "users_update" ON public.users;
--> statement-breakpoint
CREATE POLICY "users_update" ON public.users
  FOR UPDATE USING (auth.uid() = auth_id OR public.is_super_admin());
--> statement-breakpoint
DROP POLICY "notification_preferences_select" ON public.notification_preferences;
--> statement-breakpoint
CREATE POLICY "notification_preferences_select" ON public.notification_preferences
  FOR SELECT USING (
    public.is_super_admin() OR EXISTS (
      SELECT 1 FROM public.users u WHERE u.id = notification_preferences.user_id AND u.auth_id = auth.uid()
    )
  );
--> statement-breakpoint
DROP POLICY "notification_preferences_insert" ON public.notification_preferences;
--> statement-breakpoint
CREATE POLICY "notification_preferences_insert" ON public.notification_preferences
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u WHERE u.id = notification_preferences.user_id AND u.auth_id = auth.uid()
    )
  );
--> statement-breakpoint
DROP POLICY "notification_preferences_update" ON public.notification_preferences;
--> statement-breakpoint
CREATE POLICY "notification_preferences_update" ON public.notification_preferences
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.users u WHERE u.id = notification_preferences.user_id AND u.auth_id = auth.uid()
    )
  );
--> statement-breakpoint
DROP POLICY "notification_preferences_delete" ON public.notification_preferences;
--> statement-breakpoint
CREATE POLICY "notification_preferences_delete" ON public.notification_preferences
  FOR DELETE USING (
    public.is_super_admin() OR EXISTS (
      SELECT 1 FROM public.users u WHERE u.id = notification_preferences.user_id AND u.auth_id = auth.uid()
    )
  );
