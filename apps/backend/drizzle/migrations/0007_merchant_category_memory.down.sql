-- Reverte 0007 — dropa a tabela de memória de comerciante por lar (policies
-- e índice caem junto via CASCADE implícito do DROP TABLE).
DROP TABLE IF EXISTS "merchant_category_memory";
