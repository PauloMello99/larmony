-- Reverte 0004 — remove tier + trial_consumed e o enum subscription_tier.
ALTER TABLE "subscriptions" DROP COLUMN IF EXISTS "trial_consumed";
--> statement-breakpoint
ALTER TABLE "subscriptions" DROP COLUMN IF EXISTS "tier";
--> statement-breakpoint
DROP TYPE IF EXISTS "public"."subscription_tier";
