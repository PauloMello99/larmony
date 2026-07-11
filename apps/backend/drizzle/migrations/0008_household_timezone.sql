-- ============================================================================
-- 0008 — Timezone + hora de notificação do lar (M12, ADR-0024).
--
-- `households.timezone`: fuso IANA do lar — âncora de "hoje/vencimento/último
-- dia do mês" nos jobs de cron e do "mês corrente" dos orçamentos (M10). Nunca
-- offset fixo (DST resolvido pela lib no runtime). `notification_hour`: hora
-- local (0–23) a partir da qual lembrete/relatório podem sair.
--
-- NOT NULL com default: registros existentes assumem America/Sao_Paulo / 09h
-- (staging/prod são BR). Novos lares vêm com o fuso do navegador do criador.
--
-- Migration custom escrita à mão (ver README). Roda em transação (migrator).
-- ============================================================================

ALTER TABLE "households" ADD COLUMN "timezone" text DEFAULT 'America/Sao_Paulo' NOT NULL;
--> statement-breakpoint
ALTER TABLE "households" ADD COLUMN "notification_hour" smallint DEFAULT 9 NOT NULL;
