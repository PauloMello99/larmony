-- Rollback da 0011 — remove as colunas de aceite de termos.
ALTER TABLE "users" DROP COLUMN IF EXISTS "terms_accepted_at";
ALTER TABLE "users" DROP COLUMN IF EXISTS "terms_version";
