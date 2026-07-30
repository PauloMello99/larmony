-- Múltiplas identidades de autenticação por usuário (ADR-0032, adendo):
-- 1 usuário local (users.id) pode ter N identidades Supabase (senha,
-- Google, Apple) — 1 por provedor. users.auth_id continua existindo como
-- coluna legada 1:1 até uma migration futura de remoção; nenhum código
-- existente lê/escreve user_identities ainda (passo 1 de N, puramente
-- aditivo).
CREATE TYPE "public"."auth_provider" AS ENUM ('password', 'google', 'apple');
--> statement-breakpoint

CREATE TABLE "user_identities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"provider" "auth_provider" NOT NULL,
	"auth_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_identities_auth_id_unique" UNIQUE("auth_id"),
	CONSTRAINT "user_identities_user_id_provider_key" UNIQUE("user_id","provider")
);
--> statement-breakpoint

ALTER TABLE "user_identities" ADD CONSTRAINT "user_identities_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint

-- Backfill: 1 linha em user_identities por users existente. Deriva o
-- provider real de auth.identities quando possível (a conexão de migration
-- roda como role postgres/service-role, enxerga o schema auth sem
-- restrição). GoTrue grava o provider de login por senha como 'email'
-- (confirmado: SELECT provider, count(*) FROM auth.identities no ambiente
-- local só retorna 'email') — mapeado para o nosso 'password' (nome de
-- domínio, desacoplado da nomenclatura interna do GoTrue). Qualquer valor
-- não reconhecido (nem 'email'/'password', nem 'google', nem 'apple') cai
-- em 'password' via ELSE, nunca quebra o cast.
INSERT INTO public.user_identities (user_id, provider, auth_id)
SELECT
  u.id,
  (CASE
    (SELECT ai.provider FROM auth.identities ai
     WHERE ai.user_id = u.auth_id
     ORDER BY ai.created_at ASC LIMIT 1)
    WHEN 'email' THEN 'password'
    WHEN 'google' THEN 'google'
    WHEN 'apple' THEN 'apple'
    ELSE 'password'
  END)::public.auth_provider,
  u.auth_id
FROM public.users u
ON CONFLICT (auth_id) DO NOTHING;
--> statement-breakpoint

-- Só SELECT: toda escrita nesta tabela passa por DRIZZLE_ADMIN (role
-- postgres/service-role, BYPASSRLS), nunca pela conexão app_user. Conceder
-- INSERT/UPDATE/DELETE aqui seria privilégio morto hoje (não há policy
-- permitindo, então RLS já bloqueia) mas quebraria least-privilege se uma
-- policy de escrita for adicionada no futuro sem reauditar este GRANT
-- (achado do database-guardian).
GRANT SELECT ON public.user_identities TO app_user;
--> statement-breakpoint

ALTER TABLE public.user_identities ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

-- Único SELECT necessário sob RLS: o app_user (role runtime) só precisa
-- enxergar a própria linha de identidade ao fazer o join em findByAuthId
-- (o valor comparado já é auth.uid() por construção, não vem do request).
-- Escritas em user_identities sempre passam por DRIZZLE_ADMIN (mesmo padrão
-- de DrizzleUserRepository.create()), então não há policy de INSERT/UPDATE/
-- DELETE — fica bloqueado por padrão sob RLS, que é o comportamento correto
-- (só o admin escreve).
CREATE POLICY "user_identities_select" ON public.user_identities
  FOR SELECT USING (auth_id = auth.uid());
