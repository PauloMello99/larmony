-- ============================================================================
-- 0011 — Aceite de Termos de Uso/Política de Privacidade (LGPD, fase
-- pre-production).
--
-- Accountability (LGPD art. 6º, X): registrar QUANDO o titular aceitou e QUAL
-- versão dos documentos estava vigente. Gravado no sign-up (checkbox
-- obrigatório); nullable porque contas criadas antes desta migration não têm
-- aceite registrado (re-aceite em sessão fica para fase futura).
--
-- Migration custom escrita à mão (ver README). Roda em transação (migrator).
-- ============================================================================

ALTER TABLE "users" ADD COLUMN "terms_accepted_at" timestamp with time zone;
ALTER TABLE "users" ADD COLUMN "terms_version" text;
