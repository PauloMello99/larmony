-- Reverte 0002 — dropa o espelho de invoices e o enum de tipo.
DROP TABLE IF EXISTS "billing_invoice_events";
--> statement-breakpoint
DROP TYPE IF EXISTS "public"."billing_invoice_event_type";
