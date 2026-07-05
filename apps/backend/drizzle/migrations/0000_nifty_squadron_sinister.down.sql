-- Reverte o baseline 0000: derruba todas as tabelas e enums do Larmony.
DROP TABLE IF EXISTS public.transaction_members CASCADE;
DROP TABLE IF EXISTS public.goal_contributions CASCADE;
DROP TABLE IF EXISTS public.bills CASCADE;
DROP TABLE IF EXISTS public.budgets CASCADE;
DROP TABLE IF EXISTS public.goals CASCADE;
DROP TABLE IF EXISTS public.transactions CASCADE;
DROP TABLE IF EXISTS public.installment_groups CASCADE;
DROP TABLE IF EXISTS public.categories CASCADE;
DROP TABLE IF EXISTS public.notifications CASCADE;
DROP TABLE IF EXISTS public.audit_logs CASCADE;
DROP TABLE IF EXISTS public.subscriptions CASCADE;
DROP TABLE IF EXISTS public.household_invitations CASCADE;
DROP TABLE IF EXISTS public.household_memberships CASCADE;
DROP TABLE IF EXISTS public.households CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

DROP TYPE IF EXISTS public.audit_action;
DROP TYPE IF EXISTS public.notification_type;
DROP TYPE IF EXISTS public.gender;
DROP TYPE IF EXISTS public.category_type;
DROP TYPE IF EXISTS public.transaction_type;
DROP TYPE IF EXISTS public.billing_interval;
DROP TYPE IF EXISTS public.subscription_status;
DROP TYPE IF EXISTS public.subscription_type;
DROP TYPE IF EXISTS public.invitation_status;
DROP TYPE IF EXISTS public.household_role;
DROP TYPE IF EXISTS public.platform_role;
