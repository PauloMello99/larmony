-- Reverte 0003 — dropa o canal de suporte. Os 2 valores adicionados a
-- notification_type NÃO são revertidos (Postgres não suporta DROP VALUE de
-- enum, mesma limitação documentada em 0000_baseline.down.sql).
DROP TABLE IF EXISTS "support_ticket_messages";
--> statement-breakpoint
DROP TABLE IF EXISTS "support_tickets";
--> statement-breakpoint
DROP TYPE IF EXISTS "public"."support_ticket_category";
--> statement-breakpoint
DROP TYPE IF EXISTS "public"."support_ticket_status";
