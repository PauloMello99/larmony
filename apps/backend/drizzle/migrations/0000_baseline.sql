-- ============================================================================
-- 0000_baseline — SQUASH das migrations 0000..0011 (fase pre-production, P-4).
--
-- Concatenacao LITERAL da cadeia anterior, na mesma ordem (equivalencia por
-- construcao: o drizzle ja aplicava a cadeia inteira numa unica transacao).
-- Historico original preservado no git (antes deste commit). Bancos ja
-- migrados NAO rodam este arquivo: usar `migrator baseline` (ver README).
-- ============================================================================

-- ############################################################################
-- ORIGEM: 0000_nifty_squadron_sinister.sql
-- ############################################################################

CREATE TYPE "public"."audit_action" AS ENUM('create', 'update', 'delete', 'invite_sent', 'invite_accepted', 'subscription_changed');--> statement-breakpoint
CREATE TYPE "public"."billing_interval" AS ENUM('monthly', 'semiannual', 'annual');--> statement-breakpoint
CREATE TYPE "public"."category_type" AS ENUM('income', 'expense', 'both');--> statement-breakpoint
CREATE TYPE "public"."gender" AS ENUM('male', 'female', 'other');--> statement-breakpoint
CREATE TYPE "public"."household_role" AS ENUM('owner', 'member');--> statement-breakpoint
CREATE TYPE "public"."invitation_status" AS ENUM('pending', 'accepted', 'expired', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."notification_type" AS ENUM('bill_reminder', 'invite_accepted', 'goal_reached');--> statement-breakpoint
CREATE TYPE "public"."platform_role" AS ENUM('super_admin', 'user');--> statement-breakpoint
CREATE TYPE "public"."subscription_status" AS ENUM('active', 'trialing', 'past_due', 'canceled');--> statement-breakpoint
CREATE TYPE "public"."subscription_type" AS ENUM('free', 'trial', 'standard', 'custom');--> statement-breakpoint
CREATE TYPE "public"."transaction_type" AS ENUM('income', 'expense');--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"auth_id" uuid NOT NULL,
	"platform_role" "platform_role" DEFAULT 'user' NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"avatar_url" text,
	"birth_date" date,
	"gender" "gender",
	"locale" text DEFAULT 'pt-BR' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_auth_id_unique" UNIQUE("auth_id"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "household_invitations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"household_id" uuid NOT NULL,
	"invited_by" uuid NOT NULL,
	"email" text NOT NULL,
	"role" "household_role" DEFAULT 'member' NOT NULL,
	"token" text DEFAULT encode(gen_random_bytes(32), 'hex') NOT NULL,
	"status" "invitation_status" DEFAULT 'pending' NOT NULL,
	"expires_at" timestamp with time zone DEFAULT now() + interval '7 days' NOT NULL,
	"accepted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "household_invitations_token_unique" UNIQUE("token"),
	CONSTRAINT "household_invitations_household_id_email_unique" UNIQUE("household_id","email")
);
--> statement-breakpoint
CREATE TABLE "household_memberships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"household_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "household_role" DEFAULT 'member' NOT NULL,
	"permissions" text[] DEFAULT '{}' NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "household_memberships_household_id_user_id_unique" UNIQUE("household_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "households" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"logo_url" text,
	"suspended_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "households_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"household_id" uuid NOT NULL,
	"stripe_customer_id" text,
	"stripe_subscription_id" text,
	"type" "subscription_type" DEFAULT 'free' NOT NULL,
	"status" "subscription_status" DEFAULT 'active' NOT NULL,
	"billing_interval" "billing_interval",
	"price_cents" integer,
	"trial_ends_at" timestamp with time zone,
	"current_period_start" timestamp with time zone,
	"current_period_end" timestamp with time zone,
	"grace_period_days" integer DEFAULT 14 NOT NULL,
	"canceled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "subscriptions_household_id_unique" UNIQUE("household_id"),
	CONSTRAINT "subscriptions_stripe_customer_id_unique" UNIQUE("stripe_customer_id"),
	CONSTRAINT "subscriptions_stripe_subscription_id_unique" UNIQUE("stripe_subscription_id")
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"household_id" uuid,
	"type" "notification_type" NOT NULL,
	"title" text NOT NULL,
	"body" text,
	"data" jsonb,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"household_id" uuid,
	"actor_id" uuid,
	"action" "audit_action" NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" uuid,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"household_id" uuid NOT NULL,
	"name" text NOT NULL,
	"type" "category_type" DEFAULT 'expense' NOT NULL,
	"color" text DEFAULT '#8b8b8b' NOT NULL,
	"icon" text,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "installment_groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"household_id" uuid NOT NULL,
	"description" text NOT NULL,
	"total_amount_cents" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transaction_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"transaction_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"share_amount_cents" integer,
	CONSTRAINT "transaction_members_transaction_id_user_id_unique" UNIQUE("transaction_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"household_id" uuid NOT NULL,
	"created_by" uuid NOT NULL,
	"person_id" uuid,
	"category_id" uuid,
	"type" "transaction_type" NOT NULL,
	"amount_cents" integer NOT NULL,
	"description" text NOT NULL,
	"date" date NOT NULL,
	"notes" text,
	"installment_group_id" uuid,
	"installment_number" integer,
	"installment_count" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "goal_contributions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"goal_id" uuid NOT NULL,
	"created_by" uuid NOT NULL,
	"amount_cents" integer NOT NULL,
	"date" date NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "goals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"household_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"target_amount_cents" integer NOT NULL,
	"target_date" date,
	"color" text DEFAULT '#8b8b8b' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "budgets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"household_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	"month" integer NOT NULL,
	"year" integer NOT NULL,
	"amount_cents" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "budgets_household_id_category_id_month_year_unique" UNIQUE("household_id","category_id","month","year")
);
--> statement-breakpoint
CREATE TABLE "bills" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"household_id" uuid NOT NULL,
	"category_id" uuid,
	"name" text NOT NULL,
	"amount_cents" integer NOT NULL,
	"due_day" integer NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"notes" text,
	"reminder_days_before" integer,
	"reminder_last_sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "household_invitations" ADD CONSTRAINT "household_invitations_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "household_memberships" ADD CONSTRAINT "household_memberships_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "installment_groups" ADD CONSTRAINT "installment_groups_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction_members" ADD CONSTRAINT "transaction_members_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction_members" ADD CONSTRAINT "transaction_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_person_id_users_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_installment_group_id_installment_groups_id_fk" FOREIGN KEY ("installment_group_id") REFERENCES "public"."installment_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goal_contributions" ADD CONSTRAINT "goal_contributions_goal_id_goals_id_fk" FOREIGN KEY ("goal_id") REFERENCES "public"."goals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goal_contributions" ADD CONSTRAINT "goal_contributions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goals" ADD CONSTRAINT "goals_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bills" ADD CONSTRAINT "bills_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bills" ADD CONSTRAINT "bills_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "notifications_user_created_idx" ON "notifications" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "categories_household_idx" ON "categories" USING btree ("household_id");--> statement-breakpoint
CREATE INDEX "transactions_household_date_idx" ON "transactions" USING btree ("household_id","date");--> statement-breakpoint
CREATE INDEX "transactions_household_category_idx" ON "transactions" USING btree ("household_id","category_id");--> statement-breakpoint
CREATE INDEX "goal_contributions_goal_idx" ON "goal_contributions" USING btree ("goal_id");--> statement-breakpoint
CREATE INDEX "goals_household_idx" ON "goals" USING btree ("household_id");--> statement-breakpoint
CREATE INDEX "budgets_household_period_idx" ON "budgets" USING btree ("household_id","year","month");--> statement-breakpoint
CREATE INDEX "bills_household_idx" ON "bills" USING btree ("household_id");

--> statement-breakpoint

-- ############################################################################
-- ORIGEM: 0001_rls_policies.sql
-- ############################################################################

-- ============================================================================
-- 0001 â€” RLS baseline do Larmony (ADR-0005 + ADR-0015).
--
-- Helpers sobre auth.uid() (lÃª o claim `sub` de request.jwt.claims), role
-- `app_user` (LOGIN, NOBYPASSRLS) usada pelo backend em runtime (o RlsContext
-- faz set_config('request.jwt.claims', ...) por request), ENABLE RLS e
-- policies por tabela. `postgres`/`service_role` mantÃªm BYPASSRLS para
-- migrations e bootstrap.
--
-- notifications fica SEM RLS de propÃ³sito: acesso sÃ³ pelo mÃ³dulo de
-- notificaÃ§Ãµes via DRIZZLE_ADMIN, sempre escopado por user_id no cÃ³digo.
-- ============================================================================

-- â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

-- â”€â”€â”€ Role de runtime (NOBYPASSRLS) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

-- â”€â”€â”€ ENABLE RLS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

-- â”€â”€â”€ users â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

-- â”€â”€â”€ households â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

-- â”€â”€â”€ household_memberships â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

-- â”€â”€â”€ household_invitations â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

-- â”€â”€â”€ subscriptions (shell; gerenciadas pela plataforma) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

-- â”€â”€â”€ audit_logs (leitura de plataforma; escrita via app) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

CREATE POLICY "audit_logs_select" ON public.audit_logs
  FOR SELECT USING (public.is_super_admin());
--> statement-breakpoint
CREATE POLICY "audit_logs_insert" ON public.audit_logs
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
--> statement-breakpoint

-- â”€â”€â”€ categories â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

-- â”€â”€â”€ installment_groups â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

-- â”€â”€â”€ transactions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

-- â”€â”€â”€ transaction_members (escopo via transaction pai) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

-- â”€â”€â”€ goals â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

-- â”€â”€â”€ goal_contributions (escopo via goal pai) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

-- â”€â”€â”€ budgets â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

-- â”€â”€â”€ bills â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

--> statement-breakpoint

-- ############################################################################
-- ORIGEM: 0002_recurrences.sql
-- ############################################################################

-- ============================================================================
-- 0002 â€” RecorrÃªncia (M9). Regra de recorrÃªncia que gera transaÃ§Ãµes
-- automaticamente no tick do cron (recurrence-engine). Migration custom escrita
-- Ã  mÃ£o (ver README: da 0002 em diante nÃ£o hÃ¡ snapshot do drizzle-kit).
--
-- Inclui: enum recurrence_frequency, tabela recurrences (+ Ã­ndices, grants, RLS
-- member-scoped espelhando bills) e a coluna transactions.recurrence_id.
-- ============================================================================

CREATE TYPE "public"."recurrence_frequency" AS ENUM ('weekly', 'monthly', 'yearly');
--> statement-breakpoint

CREATE TABLE "recurrences" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "household_id" uuid NOT NULL,
  "created_by" uuid NOT NULL,
  "person_id" uuid,
  "category_id" uuid,
  "type" "public"."transaction_type" NOT NULL,
  "amount_cents" integer NOT NULL,
  "description" text NOT NULL,
  "frequency" "public"."recurrence_frequency" NOT NULL,
  "interval" integer DEFAULT 1 NOT NULL,
  "start_date" date NOT NULL,
  "end_date" date,
  "next_run_date" date NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "notes" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint

ALTER TABLE "recurrences" ADD CONSTRAINT "recurrences_household_id_households_id_fk"
  FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "recurrences" ADD CONSTRAINT "recurrences_created_by_users_id_fk"
  FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "recurrences" ADD CONSTRAINT "recurrences_person_id_users_id_fk"
  FOREIGN KEY ("person_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "recurrences" ADD CONSTRAINT "recurrences_category_id_categories_id_fk"
  FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint

CREATE INDEX "recurrences_household_idx" ON "recurrences" USING btree ("household_id");
--> statement-breakpoint
CREATE INDEX "recurrences_due_idx" ON "recurrences" USING btree ("is_active", "next_run_date");
--> statement-breakpoint

ALTER TABLE "transactions" ADD COLUMN "recurrence_id" uuid;
--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_recurrence_id_recurrences_id_fk"
  FOREIGN KEY ("recurrence_id") REFERENCES "public"."recurrences"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint

-- Grant explÃ­cito (a tabela nova herdaria via ALTER DEFAULT PRIVILEGES da 0001,
-- mas mantemos explÃ­cito para clareza e robustez).
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recurrences TO app_user;
--> statement-breakpoint

-- â”€â”€â”€ RLS (member-scoped, espelha bills) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
ALTER TABLE public.recurrences ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "recurrences_select" ON public.recurrences
  FOR SELECT USING (public.is_super_admin() OR public.is_household_member(household_id));
--> statement-breakpoint
CREATE POLICY "recurrences_insert" ON public.recurrences
  FOR INSERT WITH CHECK (public.is_super_admin() OR public.is_household_member(household_id));
--> statement-breakpoint
CREATE POLICY "recurrences_update" ON public.recurrences
  FOR UPDATE USING (public.is_super_admin() OR public.is_household_member(household_id));
--> statement-breakpoint
CREATE POLICY "recurrences_delete" ON public.recurrences
  FOR DELETE USING (public.is_super_admin() OR public.is_household_member(household_id));

--> statement-breakpoint

-- ############################################################################
-- ORIGEM: 0003_user_onboarding.sql
-- ############################################################################

ALTER TABLE "users" ADD COLUMN "onboarding" jsonb DEFAULT '{}'::jsonb NOT NULL;

--> statement-breakpoint

-- ############################################################################
-- ORIGEM: 0004_users_select_household_peers.sql
-- ############################################################################

-- ============================================================================
-- 0004 â€” Co-membros podem ler as linhas de `users` uns dos outros (RLS).
--
-- Bug: a lista de membros (households/list-members) roda na conexÃ£o RLS
-- (`app_user`) e faz INNER JOIN em `users`. A policy `users_select` sÃ³ permite
-- ver a prÃ³pria linha (auth.uid() = auth_id), entÃ£o o join descartava todos os
-- demais membros do lar â€” inclusive quem acabou de aceitar um convite.
--
-- Fix: helper SECURITY DEFINER `shares_household_with(uuid)` + uma SEGUNDA policy
-- permissiva `users_select_household_peers` (OR com a `users_select` existente,
-- que NÃƒO Ã© alterada). Espelha o padrÃ£o de `is_household_member` (0001).
--
-- Nota: RLS Ã© por linha, nÃ£o por coluna â€” co-membros passam a poder ler a linha
-- inteira de `users` (a query da app sÃ³ seleciona name/email). AceitÃ¡vel no v1:
-- a lista de membros jÃ¡ exibe nome + e-mail, e auth_id nÃ£o Ã© explorÃ¡vel (RLS
-- chaveia no claim `sub` do JWT, nÃ£o em coluna lida).
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

--> statement-breakpoint

-- ############################################################################
-- ORIGEM: 0005_scheduled_transaction_entries.sql
-- ############################################################################

-- ============================================================================
-- 0005 â€” LanÃ§amentos programados (ADR-0020, supersede ADR-0019).
--
-- Funde `bills` (definiÃ§Ã£o estÃ¡tica + lembrete + lanÃ§amento manual) e
-- `recurrences` (geraÃ§Ã£o automÃ¡tica via cron) numa Ãºnica tabela
-- `scheduled_transaction_entries`, com eixo `posting_mode` (auto|manual).
-- Migra os dados das duas tabelas, renomeia a proveniÃªncia em transactions
-- (recurrence_id â†’ scheduled_transaction_entry_id) e dropa as tabelas antigas.
--
-- Migration custom escrita Ã  mÃ£o (ver README). Roda em transaÃ§Ã£o (migrator),
-- entÃ£o qualquer falha reverte tudo.
-- ============================================================================

CREATE TYPE "public"."scheduled_posting_mode" AS ENUM ('auto', 'manual');
--> statement-breakpoint

CREATE TABLE "scheduled_transaction_entries" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "household_id" uuid NOT NULL,
  "posting_mode" "public"."scheduled_posting_mode" NOT NULL,
  "created_by" uuid NOT NULL,
  "person_id" uuid,
  "category_id" uuid,
  "type" "public"."transaction_type" NOT NULL,
  "amount_cents" integer NOT NULL,
  "description" text NOT NULL,
  "frequency" "public"."recurrence_frequency" NOT NULL,
  "interval" integer DEFAULT 1 NOT NULL,
  "start_date" date NOT NULL,
  "end_date" date,
  "next_run_date" date,
  "is_active" boolean DEFAULT true NOT NULL,
  "notes" text,
  "reminder_days_before" integer,
  "reminder_last_sent_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  -- Cursor existe SE E SOMENTE SE o modo Ã© auto (defesa fÃ­sica: um scan sem
  -- filtro de posting_mode nÃ£o consegue gerar de uma linha manual, pois
  -- `NULL <= today` Ã© falso).
  CONSTRAINT "sched_cursor_matches_mode"
    CHECK (("posting_mode" = 'auto') = ("next_run_date" IS NOT NULL))
);
--> statement-breakpoint

ALTER TABLE "scheduled_transaction_entries" ADD CONSTRAINT "scheduled_transaction_entries_household_id_households_id_fk"
  FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "scheduled_transaction_entries" ADD CONSTRAINT "scheduled_transaction_entries_created_by_users_id_fk"
  FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "scheduled_transaction_entries" ADD CONSTRAINT "scheduled_transaction_entries_person_id_users_id_fk"
  FOREIGN KEY ("person_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "scheduled_transaction_entries" ADD CONSTRAINT "scheduled_transaction_entries_category_id_categories_id_fk"
  FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint

CREATE INDEX "sched_household_idx" ON "scheduled_transaction_entries" USING btree ("household_id");
--> statement-breakpoint
CREATE INDEX "sched_engine_due_idx" ON "scheduled_transaction_entries" USING btree ("posting_mode", "is_active", "next_run_date");
--> statement-breakpoint

GRANT SELECT, INSERT, UPDATE, DELETE ON public.scheduled_transaction_entries TO app_user;
--> statement-breakpoint

-- â”€â”€â”€ RLS (member-scoped, espelha bills/recurrences) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
ALTER TABLE public.scheduled_transaction_entries ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "scheduled_transaction_entries_select" ON public.scheduled_transaction_entries
  FOR SELECT USING (public.is_super_admin() OR public.is_household_member(household_id));
--> statement-breakpoint
CREATE POLICY "scheduled_transaction_entries_insert" ON public.scheduled_transaction_entries
  FOR INSERT WITH CHECK (public.is_super_admin() OR public.is_household_member(household_id));
--> statement-breakpoint
CREATE POLICY "scheduled_transaction_entries_update" ON public.scheduled_transaction_entries
  FOR UPDATE USING (public.is_super_admin() OR public.is_household_member(household_id));
--> statement-breakpoint
CREATE POLICY "scheduled_transaction_entries_delete" ON public.scheduled_transaction_entries
  FOR DELETE USING (public.is_super_admin() OR public.is_household_member(household_id));
--> statement-breakpoint

-- â”€â”€â”€ Guarda: toda bill precisa de um membro do lar (created_by nÃ£o-nulo) â”€â”€â”€â”€â”€
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.bills b
    WHERE NOT EXISTS (
      SELECT 1 FROM public.household_memberships hm WHERE hm.household_id = b.household_id
    )
  ) THEN
    RAISE EXCEPTION 'MigraÃ§Ã£o 0005 abortada: existe bill em household sem nenhum membership (created_by ficaria nulo).';
  END IF;
END $$;
--> statement-breakpoint

-- â”€â”€â”€ recurrences â†’ entries (posting_mode=auto, PRESERVA id) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- Preservar o id Ã© o que torna o backfill de proveniÃªncia (abaixo) vÃ¡lido.
INSERT INTO public.scheduled_transaction_entries
  (id, household_id, posting_mode, created_by, person_id, category_id, type,
   amount_cents, description, frequency, interval, start_date, end_date,
   next_run_date, is_active, notes, reminder_days_before, reminder_last_sent_at,
   created_at, updated_at)
SELECT
  r.id, r.household_id, 'auto', r.created_by, r.person_id, r.category_id, r.type,
  r.amount_cents, r.description, r.frequency, r.interval, r.start_date, r.end_date,
  r.next_run_date, r.is_active, r.notes, NULL, NULL,
  r.created_at, r.updated_at
FROM public.recurrences r;
--> statement-breakpoint

-- â”€â”€â”€ bills â†’ entries (posting_mode=manual, type=expense, cadÃªncia mensal) â”€â”€â”€â”€â”€
-- start_date sintetizado ancorado em JANEIRO (31 dias) p/ preservar due_day 29â€“31;
-- o valor absoluto Ã© irrelevante no modo manual â€” sÃ³ o dia-do-mÃªs importa.
-- created_by = owner do lar (fallback: membership mais antiga).
INSERT INTO public.scheduled_transaction_entries
  (household_id, posting_mode, created_by, person_id, category_id, type,
   amount_cents, description, frequency, interval, start_date, end_date,
   next_run_date, is_active, notes, reminder_days_before, reminder_last_sent_at,
   created_at, updated_at)
SELECT
  b.household_id,
  'manual',
  (SELECT hm.user_id FROM public.household_memberships hm
     WHERE hm.household_id = b.household_id
     ORDER BY (hm.role = 'owner') DESC, hm.joined_at ASC
     LIMIT 1),
  NULL,
  b.category_id,
  'expense',
  b.amount_cents,
  b.name,
  'monthly',
  1,
  make_date(EXTRACT(YEAR FROM now())::int, 1, b.due_day),
  NULL,
  NULL,
  b.is_active,
  b.notes,
  b.reminder_days_before,
  b.reminder_last_sent_at,
  b.created_at,
  b.updated_at
FROM public.bills b;
--> statement-breakpoint

-- â”€â”€â”€ ProveniÃªncia: recurrence_id â†’ scheduled_transaction_entry_id â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
ALTER TABLE "transactions" ADD COLUMN "scheduled_transaction_entry_id" uuid;
--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_scheduled_transaction_entry_id_fk"
  FOREIGN KEY ("scheduled_transaction_entry_id") REFERENCES "public"."scheduled_transaction_entries"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
-- VÃ¡lido porque os ids das recurrences foram preservados acima.
UPDATE "transactions" SET "scheduled_transaction_entry_id" = "recurrence_id"
  WHERE "recurrence_id" IS NOT NULL;
--> statement-breakpoint

-- â”€â”€â”€ Drop da proveniÃªncia antiga (ANTES de dropar recurrences: dependÃªncia FK) â”€
ALTER TABLE "transactions" DROP CONSTRAINT IF EXISTS "transactions_recurrence_id_recurrences_id_fk";
--> statement-breakpoint
ALTER TABLE "transactions" DROP COLUMN IF EXISTS "recurrence_id";
--> statement-breakpoint

-- â”€â”€â”€ Drop das tabelas antigas â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
DROP TABLE IF EXISTS "bills";
--> statement-breakpoint
DROP TABLE IF EXISTS "recurrences";
--> statement-breakpoint
-- Enum recurrence_frequency Ã© REUSADO pela nova tabela â†’ NÃƒO dropar.
-- transaction_type tambÃ©m segue em uso.

--> statement-breakpoint

-- ############################################################################
-- ORIGEM: 0006_budget_versioning.sql
-- ############################################################################

-- ============================================================================
-- 0006 â€” OrÃ§amentos recorrentes/versionados (M10, ADR-0021).
--
-- `budgets` deixa de ser uma linha por (household, categoria, mÃªs, ano) e
-- passa a ser a SÃ‰RIE de uma categoria (identidade + `ended_from` opcional).
-- O limite em si migra para a nova `budget_versions` (histÃ³rico de
-- amount_cents por `effective_from`), resolvido on-read pelo repositÃ³rio â€”
-- nunca materializado por perÃ­odo.
--
-- SEM BACKFILL DE VALORES (decisÃ£o do kickoff M10): produÃ§Ã£o intocada,
-- staging Ã© dado de teste descartÃ¡vel. Os orÃ§amentos existentes sÃ£o
-- descartados; usuÃ¡rios reconfiguram. Ver ADR-0021.
--
-- Migration custom escrita Ã  mÃ£o (ver README). Roda em transaÃ§Ã£o (migrator),
-- entÃ£o qualquer falha reverte tudo.
-- ============================================================================

-- â”€â”€â”€ budgets: de linha-por-mÃªs para sÃ©rie â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
DROP INDEX IF EXISTS "budgets_household_period_idx";
--> statement-breakpoint
ALTER TABLE "budgets" DROP CONSTRAINT IF EXISTS "budgets_household_id_category_id_month_year_unique";
--> statement-breakpoint
ALTER TABLE "budgets" ADD COLUMN "ended_from" date;
--> statement-breakpoint
ALTER TABLE "budgets" DROP COLUMN "amount_cents";
--> statement-breakpoint
ALTER TABLE "budgets" DROP COLUMN "month";
--> statement-breakpoint
ALTER TABLE "budgets" DROP COLUMN "year";
--> statement-breakpoint

-- SÃ³ uma sÃ©rie ABERTA por categoria â€” sÃ©ries encerradas nÃ£o conflitam,
-- permitindo recriar apÃ³s remover (ver domain-rules Â§OrÃ§amentos).
CREATE UNIQUE INDEX "budgets_open_series_unique" ON "budgets" USING btree ("household_id","category_id") WHERE "ended_from" IS NULL;
--> statement-breakpoint
CREATE INDEX "budgets_household_category_idx" ON "budgets" USING btree ("household_id","category_id");
--> statement-breakpoint

-- RLS de `budgets` (0001) segue vÃ¡lida sem alteraÃ§Ã£o â€” as policies sÃ³
-- referenciam household_id, que nÃ£o mudou.

-- â”€â”€â”€ budget_versions: histÃ³rico de limites â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CREATE TABLE "budget_versions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "budget_id" uuid NOT NULL,
  "amount_cents" integer NOT NULL,
  "effective_from" date NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "budget_versions_budget_id_effective_from_unique" UNIQUE("budget_id","effective_from")
);
--> statement-breakpoint

ALTER TABLE "budget_versions" ADD CONSTRAINT "budget_versions_budget_id_budgets_id_fk"
  FOREIGN KEY ("budget_id") REFERENCES "public"."budgets"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint

CREATE INDEX "budget_versions_budget_effective_idx" ON "budget_versions" USING btree ("budget_id","effective_from");
--> statement-breakpoint

GRANT SELECT, INSERT, UPDATE, DELETE ON public.budget_versions TO app_user;
--> statement-breakpoint

-- â”€â”€â”€ RLS de budget_versions (member-scoped via sÃ©rie pai, sem household_id prÃ³prio) â”€
ALTER TABLE public.budget_versions ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "budget_versions_select" ON public.budget_versions
  FOR SELECT USING (
    public.is_super_admin() OR EXISTS (
      SELECT 1 FROM public.budgets b
      WHERE b.id = budget_versions.budget_id AND public.is_household_member(b.household_id)
    )
  );
--> statement-breakpoint
CREATE POLICY "budget_versions_insert" ON public.budget_versions
  FOR INSERT WITH CHECK (
    public.is_super_admin() OR EXISTS (
      SELECT 1 FROM public.budgets b
      WHERE b.id = budget_versions.budget_id AND public.is_household_member(b.household_id)
    )
  );
--> statement-breakpoint
CREATE POLICY "budget_versions_update" ON public.budget_versions
  FOR UPDATE USING (
    public.is_super_admin() OR EXISTS (
      SELECT 1 FROM public.budgets b
      WHERE b.id = budget_versions.budget_id AND public.is_household_member(b.household_id)
    )
  );
--> statement-breakpoint
CREATE POLICY "budget_versions_delete" ON public.budget_versions
  FOR DELETE USING (
    public.is_super_admin() OR EXISTS (
      SELECT 1 FROM public.budgets b
      WHERE b.id = budget_versions.budget_id AND public.is_household_member(b.household_id)
    )
  );

--> statement-breakpoint

-- ############################################################################
-- ORIGEM: 0007_notification_dispatcher.sql
-- ############################################################################

-- ============================================================================
-- 0007 â€” NotificaÃ§Ãµes multicanal + preferÃªncias (M11, ADR-0023).
--
-- Estende o enum `notification_type` (event key Ãºnico, reusado por inbox
-- in-app + preferÃªncias + dispatcher) com os 3 eventos novos. Cria
-- `notification_channel` (canais configurÃ¡veis â€” in-app nunca entra, Ã©
-- sempre gravado) + duas tabelas: `notification_preferences` (matriz por
-- USUÃRIO, RLS prÃ³pria) e `notification_dedup` (marcador por EVENTO/contexto,
-- SEM RLS â€” mesmo padrÃ£o de `notifications`: acesso sÃ³ via DRIZZLE_ADMIN,
-- escopado no cÃ³digo, porque cobre tanto fluxos de request quanto de cron).
--
-- Migration custom escrita Ã  mÃ£o (ver README). Roda em transaÃ§Ã£o (migrator).
-- ============================================================================

ALTER TYPE "public"."notification_type" ADD VALUE 'auto_launch';
--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'budget_exceeded';
--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'monthly_report';
--> statement-breakpoint

CREATE TYPE "public"."notification_channel" AS ENUM ('email', 'sms', 'whatsapp');
--> statement-breakpoint

-- â”€â”€â”€ notification_preferences: matriz eventoÃ—canal por usuÃ¡rio â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CREATE TABLE "notification_preferences" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "event_type" "public"."notification_type" NOT NULL,
  "channel" "public"."notification_channel" NOT NULL,
  "enabled" boolean NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "notification_preferences_user_id_event_type_channel_unique" UNIQUE("user_id","event_type","channel")
);
--> statement-breakpoint

ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_user_id_users_id_fk"
  FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notification_preferences TO app_user;
--> statement-breakpoint

-- RLS: o usuÃ¡rio sÃ³ vÃª/edita as prÃ³prias preferÃªncias (join por auth_id, jÃ¡
-- que a tabela guarda users.id, nÃ£o auth_id â€” mesmo padrÃ£o do M10 em
-- budget_versions, que nÃ£o tem household_id prÃ³prio).
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "notification_preferences_select" ON public.notification_preferences
  FOR SELECT USING (
    public.is_super_admin() OR EXISTS (
      SELECT 1 FROM public.users u WHERE u.id = notification_preferences.user_id AND u.auth_id = auth.uid()
    )
  );
--> statement-breakpoint
CREATE POLICY "notification_preferences_insert" ON public.notification_preferences
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u WHERE u.id = notification_preferences.user_id AND u.auth_id = auth.uid()
    )
  );
--> statement-breakpoint
CREATE POLICY "notification_preferences_update" ON public.notification_preferences
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.users u WHERE u.id = notification_preferences.user_id AND u.auth_id = auth.uid()
    )
  );
--> statement-breakpoint
CREATE POLICY "notification_preferences_delete" ON public.notification_preferences
  FOR DELETE USING (
    public.is_super_admin() OR EXISTS (
      SELECT 1 FROM public.users u WHERE u.id = notification_preferences.user_id AND u.auth_id = auth.uid()
    )
  );
--> statement-breakpoint

-- â”€â”€â”€ notification_dedup: marcador por evento/contexto, sem RLS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CREATE TABLE "notification_dedup" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "household_id" uuid NOT NULL,
  "event_type" "public"."notification_type" NOT NULL,
  "context_id" uuid NOT NULL,
  "period_key" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "notification_dedup_event_type_context_id_period_key_unique" UNIQUE("event_type","context_id","period_key")
);
--> statement-breakpoint

ALTER TABLE "notification_dedup" ADD CONSTRAINT "notification_dedup_household_id_households_id_fk"
  FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint

CREATE INDEX "notification_dedup_household_idx" ON "notification_dedup" USING btree ("household_id");
--> statement-breakpoint

-- Sem GRANT a app_user e sem RLS de propÃ³sito (mesmo padrÃ£o de
-- `notifications`, que tambÃ©m nÃ£o tem GRANT nem RLS): dedup sÃ³ Ã© gravado/lido
-- via DRIZZLE_ADMIN (role `postgres`, bypassa GRANT), escopado por
-- household_id no cÃ³digo â€” inclusive nos hooks que rodam em request context
-- (goal/budget), para nÃ£o depender de qual conexÃ£o o caller injetou. Sem
-- GRANT, um uso acidental de DRIZZLE (request-scoped) nesta tabela falha
-- imediatamente com permission-denied, em vez de silenciosamente escapar do
-- escopo â€” defesa em profundidade.

--> statement-breakpoint

-- ############################################################################
-- ORIGEM: 0008_household_timezone.sql
-- ############################################################################

-- ============================================================================
-- 0008 â€” Timezone + hora de notificaÃ§Ã£o do lar (M12, ADR-0024).
--
-- `households.timezone`: fuso IANA do lar â€” Ã¢ncora de "hoje/vencimento/Ãºltimo
-- dia do mÃªs" nos jobs de cron e do "mÃªs corrente" dos orÃ§amentos (M10). Nunca
-- offset fixo (DST resolvido pela lib no runtime). `notification_hour`: hora
-- local (0â€“23) a partir da qual lembrete/relatÃ³rio podem sair.
--
-- NOT NULL com default: registros existentes assumem America/Sao_Paulo / 09h
-- (staging/prod sÃ£o BR). Novos lares vÃªm com o fuso do navegador do criador.
--
-- Migration custom escrita Ã  mÃ£o (ver README). Roda em transaÃ§Ã£o (migrator).
-- ============================================================================

ALTER TABLE "households" ADD COLUMN "timezone" text DEFAULT 'America/Sao_Paulo' NOT NULL;
--> statement-breakpoint
ALTER TABLE "households" ADD COLUMN "notification_hour" smallint DEFAULT 9 NOT NULL;

--> statement-breakpoint

-- ############################################################################
-- ORIGEM: 0009_billing_stripe_entitlements.sql
-- ############################################################################

-- ============================================================================
-- 0009 â€” Billing: Stripe + entitlements + comp/desconto administrativo (M14, ADR-0026).
--
-- Estende `subscriptions` (shell existente, zero cÃ³digo de aplicaÃ§Ã£o atÃ©
-- aqui) com colunas para desconto (via Stripe Coupon, criado/anexado pela
-- nossa prÃ³pria API â€” cache local sÃ³ para exibiÃ§Ã£o) e isenÃ§Ã£o/comp (100%
-- local, nunca toca o Stripe). Nova tabela `stripe_webhook_events` para
-- idempotÃªncia do webhook (PK = event id do Stripe).
--
-- Backfill: households sem linha em `subscriptions` recebem free/active â€”
-- a tabela nunca teve nenhuma escrita de aplicaÃ§Ã£o atÃ© aqui (shell puro, ver
-- ADR-0015/ADR-0026), entÃ£o Ã© seguro cobrir 100% dos households existentes
-- sem risco de conflito.
--
-- Migration custom escrita Ã  mÃ£o (ver README). Roda em transaÃ§Ã£o (migrator).
-- ============================================================================

-- â”€â”€â”€ subscriptions: colunas de desconto/isenÃ§Ã£o â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

ALTER TABLE "subscriptions" ADD COLUMN "stripe_price_id" text;
--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "stripe_coupon_id" text;
--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "discount_percent" smallint;
--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "comp_reason" text;
--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "comp_granted_by" uuid;
--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "comp_expires_at" timestamp with time zone;
--> statement-breakpoint

ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_comp_granted_by_users_id_fk"
  FOREIGN KEY ("comp_granted_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint

-- â”€â”€â”€ stripe_webhook_events: idempotÃªncia do webhook â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

CREATE TABLE "stripe_webhook_events" (
	"id" text PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processed_at" timestamp with time zone
);
--> statement-breakpoint

-- Sem GRANT a app_user e sem RLS de propÃ³sito (mesmo padrÃ£o de
-- `notification_dedup`): sÃ³ DRIZZLE_ADMIN (role postgres, BYPASSRLS) grava e
-- lÃª esta tabela â€” o webhook do Stripe roda fora de request context, sem
-- claims, e a ausÃªncia de GRANT jÃ¡ barra `app_user` antes do RLS ser avaliado.

-- â”€â”€â”€ Backfill: households sem subscription recebem free/active â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

INSERT INTO public.subscriptions (household_id, type, status)
SELECT h.id, 'free', 'active'
FROM public.households h
WHERE NOT EXISTS (
  SELECT 1 FROM public.subscriptions s WHERE s.household_id = h.id
);

--> statement-breakpoint

-- ############################################################################
-- ORIGEM: 0010_billing_plan_catalog.sql
-- ############################################################################

-- ============================================================================
-- 0010 â€” CatÃ¡logo de planos (produtos/preÃ§os) espelhado com o Stripe (M14).
--
-- `billing_plans`: referÃªncia local dos planos que o produto vende (hoje sÃ³
-- "Larmony Premium" mensal). O catÃ¡logo Ã© declarado em cÃ³digo
-- (`subscriptions/domain/plan-catalog.ts`) e sincronizado com o Stripe no
-- boot (`PlanCatalogService`, OnModuleInit) â€” o Stripe Ã© a fonte de verdade
-- de existÃªncia (via `lookup_key` do Price), esta tabela Ã© sÃ³ um cache local
-- rÃ¡pido para os use-cases nÃ£o precisarem chamar o Stripe a cada checkout.
--
-- Sem GRANT a app_user e sem RLS de propÃ³sito (mesmo padrÃ£o de
-- `stripe_webhook_events`/`notification_dedup`): Ã© config de plataforma, sÃ³
-- DRIZZLE_ADMIN toca.
--
-- Migration custom escrita Ã  mÃ£o (ver README). Roda em transaÃ§Ã£o (migrator).
-- ============================================================================

CREATE TABLE "billing_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"stripe_product_id" text,
	"stripe_price_id" text,
	"name" text NOT NULL,
	"amount_cents" integer NOT NULL,
	"currency" text NOT NULL,
	"interval" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"last_synced_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "billing_plans_key_unique" UNIQUE("key")
);

--> statement-breakpoint

-- ############################################################################
-- ORIGEM: 0011_terms_consent.sql
-- ############################################################################

-- ============================================================================
-- 0011 â€” Aceite de Termos de Uso/PolÃ­tica de Privacidade (LGPD, fase
-- pre-production).
--
-- Accountability (LGPD art. 6Âº, X): registrar QUANDO o titular aceitou e QUAL
-- versÃ£o dos documentos estava vigente. Gravado no sign-up (checkbox
-- obrigatÃ³rio); nullable porque contas criadas antes desta migration nÃ£o tÃªm
-- aceite registrado (re-aceite em sessÃ£o fica para fase futura).
--
-- Migration custom escrita Ã  mÃ£o (ver README). Roda em transaÃ§Ã£o (migrator).
-- ============================================================================

ALTER TABLE "users" ADD COLUMN "terms_accepted_at" timestamp with time zone;
ALTER TABLE "users" ADD COLUMN "terms_version" text;
