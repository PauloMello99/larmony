-- ============================================================================
-- 0007 — Notificações multicanal + preferências (M11, ADR-0023).
--
-- Estende o enum `notification_type` (event key único, reusado por inbox
-- in-app + preferências + dispatcher) com os 3 eventos novos. Cria
-- `notification_channel` (canais configuráveis — in-app nunca entra, é
-- sempre gravado) + duas tabelas: `notification_preferences` (matriz por
-- USUÁRIO, RLS própria) e `notification_dedup` (marcador por EVENTO/contexto,
-- SEM RLS — mesmo padrão de `notifications`: acesso só via DRIZZLE_ADMIN,
-- escopado no código, porque cobre tanto fluxos de request quanto de cron).
--
-- Migration custom escrita à mão (ver README). Roda em transação (migrator).
-- ============================================================================

ALTER TYPE "public"."notification_type" ADD VALUE 'auto_launch';
--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'budget_exceeded';
--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'monthly_report';
--> statement-breakpoint

CREATE TYPE "public"."notification_channel" AS ENUM ('email', 'sms', 'whatsapp');
--> statement-breakpoint

-- ─── notification_preferences: matriz evento×canal por usuário ─────────────
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

-- RLS: o usuário só vê/edita as próprias preferências (join por auth_id, já
-- que a tabela guarda users.id, não auth_id — mesmo padrão do M10 em
-- budget_versions, que não tem household_id próprio).
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

-- ─── notification_dedup: marcador por evento/contexto, sem RLS ─────────────
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

-- Sem GRANT a app_user e sem RLS de propósito (mesmo padrão de
-- `notifications`, que também não tem GRANT nem RLS): dedup só é gravado/lido
-- via DRIZZLE_ADMIN (role `postgres`, bypassa GRANT), escopado por
-- household_id no código — inclusive nos hooks que rodam em request context
-- (goal/budget), para não depender de qual conexão o caller injetou. Sem
-- GRANT, um uso acidental de DRIZZLE (request-scoped) nesta tabela falha
-- imediatamente com permission-denied, em vez de silenciosamente escapar do
-- escopo — defesa em profundidade.
