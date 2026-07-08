-- Rollback da 0002 — Recorrência (M9).
ALTER TABLE "transactions" DROP CONSTRAINT IF EXISTS "transactions_recurrence_id_recurrences_id_fk";
--> statement-breakpoint
ALTER TABLE "transactions" DROP COLUMN IF EXISTS "recurrence_id";
--> statement-breakpoint
DROP TABLE IF EXISTS "recurrences";
--> statement-breakpoint
DROP TYPE IF EXISTS "public"."recurrence_frequency";
