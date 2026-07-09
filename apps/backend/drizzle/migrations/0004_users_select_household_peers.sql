-- ============================================================================
-- 0004 — Co-membros podem ler as linhas de `users` uns dos outros (RLS).
--
-- Bug: a lista de membros (households/list-members) roda na conexão RLS
-- (`app_user`) e faz INNER JOIN em `users`. A policy `users_select` só permite
-- ver a própria linha (auth.uid() = auth_id), então o join descartava todos os
-- demais membros do lar — inclusive quem acabou de aceitar um convite.
--
-- Fix: helper SECURITY DEFINER `shares_household_with(uuid)` + uma SEGUNDA policy
-- permissiva `users_select_household_peers` (OR com a `users_select` existente,
-- que NÃO é alterada). Espelha o padrão de `is_household_member` (0001).
--
-- Nota: RLS é por linha, não por coluna — co-membros passam a poder ler a linha
-- inteira de `users` (a query da app só seleciona name/email). Aceitável no v1:
-- a lista de membros já exibe nome + e-mail, e auth_id não é explorável (RLS
-- chaveia no claim `sub` do JWT, não em coluna lida).
-- ============================================================================

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

CREATE POLICY "users_select_household_peers" ON public.users
  FOR SELECT USING (public.shares_household_with(id));
