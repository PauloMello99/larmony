-- Reverte a normalização das tags de locale (en-US -> en, es-ES -> es).
UPDATE "public"."users" SET "locale" = 'en' WHERE "locale" = 'en-US';--> statement-breakpoint
UPDATE "public"."users" SET "locale" = 'es' WHERE "locale" = 'es-ES';
