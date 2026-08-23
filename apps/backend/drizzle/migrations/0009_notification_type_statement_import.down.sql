-- Postgres não suporta DROP VALUE de enum. Reversão real exigiria rebuild
-- do tipo (criar notification_type_old, ALTER COLUMN ... USING, DROP TYPE,
-- RENAME) — não bloqueante: nenhuma linha usa os 2 valores novos antes do
-- módulo statement-import existir e chamar DispatchNotificationUseCase com
-- eles. Mesmo custo conhecido de qualquer outro ALTER TYPE ADD VALUE do
-- projeto (ex.: 0003_support_tickets.sql).
SELECT 1;
