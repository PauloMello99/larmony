-- Modelo de assinatura pago-only com 2 tiers (M16). Adiciona o tier do plano
-- pago (Essencial/Completo) e o flag de trial já consumido (1 trial por lar).
-- Nada é destrutivo: `free` continua sendo o estado-padrão, agora significando
-- "sem assinatura ativa" (locked/somente-leitura) em vez de "plano grátis".
CREATE TYPE "public"."subscription_tier" AS ENUM ('essencial', 'completo');
--> statement-breakpoint

ALTER TABLE "subscriptions" ADD COLUMN "tier" "subscription_tier";
--> statement-breakpoint

ALTER TABLE "subscriptions" ADD COLUMN "trial_consumed" boolean DEFAULT false NOT NULL;
