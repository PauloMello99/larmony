-- Dois eventos novos no dispatcher de notificações (ADR-0023): aviso ao
-- usuário que fez upload quando o import de extrato termina (sucesso ou
-- falha). Mesmo padrão de 0003 (support_ticket_created/support_reply).
ALTER TYPE "public"."notification_type" ADD VALUE 'statement_import_completed';
--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'statement_import_failed';
