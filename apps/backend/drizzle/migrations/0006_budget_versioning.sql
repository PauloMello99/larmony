-- ============================================================================
-- 0006 — Orçamentos recorrentes/versionados (M10, ADR-0021).
--
-- `budgets` deixa de ser uma linha por (household, categoria, mês, ano) e
-- passa a ser a SÉRIE de uma categoria (identidade + `ended_from` opcional).
-- O limite em si migra para a nova `budget_versions` (histórico de
-- amount_cents por `effective_from`), resolvido on-read pelo repositório —
-- nunca materializado por período.
--
-- SEM BACKFILL DE VALORES (decisão do kickoff M10): produção intocada,
-- staging é dado de teste descartável. Os orçamentos existentes são
-- descartados; usuários reconfiguram. Ver ADR-0021.
--
-- Migration custom escrita à mão (ver README). Roda em transação (migrator),
-- então qualquer falha reverte tudo.
-- ============================================================================

-- ─── budgets: de linha-por-mês para série ───────────────────────────────────
DROP INDEX IF EXISTS "budgets_household_period_idx";
--> statement-breakpoint
ALTER TABLE "budgets" DROP CONSTRAINT IF EXISTS "budgets_household_id_category_id_month_year_unique";
--> statement-breakpoint
ALTER TABLE "budgets" ADD COLUMN "ended_from" date;
--> statement-breakpoint
ALTER TABLE "budgets" DROP COLUMN "amount_cents";
--> statement-breakpoint
ALTER TABLE "budgets" DROP COLUMN "month";
--> statement-breakpoint
ALTER TABLE "budgets" DROP COLUMN "year";
--> statement-breakpoint

-- Só uma série ABERTA por categoria — séries encerradas não conflitam,
-- permitindo recriar após remover (ver domain-rules §Orçamentos).
CREATE UNIQUE INDEX "budgets_open_series_unique" ON "budgets" USING btree ("household_id","category_id") WHERE "ended_from" IS NULL;
--> statement-breakpoint
CREATE INDEX "budgets_household_category_idx" ON "budgets" USING btree ("household_id","category_id");
--> statement-breakpoint

-- RLS de `budgets` (0001) segue válida sem alteração — as policies só
-- referenciam household_id, que não mudou.

-- ─── budget_versions: histórico de limites ──────────────────────────────────
CREATE TABLE "budget_versions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "budget_id" uuid NOT NULL,
  "amount_cents" integer NOT NULL,
  "effective_from" date NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "budget_versions_budget_id_effective_from_unique" UNIQUE("budget_id","effective_from")
);
--> statement-breakpoint

ALTER TABLE "budget_versions" ADD CONSTRAINT "budget_versions_budget_id_budgets_id_fk"
  FOREIGN KEY ("budget_id") REFERENCES "public"."budgets"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint

CREATE INDEX "budget_versions_budget_effective_idx" ON "budget_versions" USING btree ("budget_id","effective_from");
--> statement-breakpoint

GRANT SELECT, INSERT, UPDATE, DELETE ON public.budget_versions TO app_user;
--> statement-breakpoint

-- ─── RLS de budget_versions (member-scoped via série pai, sem household_id próprio) ─
ALTER TABLE public.budget_versions ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "budget_versions_select" ON public.budget_versions
  FOR SELECT USING (
    public.is_super_admin() OR EXISTS (
      SELECT 1 FROM public.budgets b
      WHERE b.id = budget_versions.budget_id AND public.is_household_member(b.household_id)
    )
  );
--> statement-breakpoint
CREATE POLICY "budget_versions_insert" ON public.budget_versions
  FOR INSERT WITH CHECK (
    public.is_super_admin() OR EXISTS (
      SELECT 1 FROM public.budgets b
      WHERE b.id = budget_versions.budget_id AND public.is_household_member(b.household_id)
    )
  );
--> statement-breakpoint
CREATE POLICY "budget_versions_update" ON public.budget_versions
  FOR UPDATE USING (
    public.is_super_admin() OR EXISTS (
      SELECT 1 FROM public.budgets b
      WHERE b.id = budget_versions.budget_id AND public.is_household_member(b.household_id)
    )
  );
--> statement-breakpoint
CREATE POLICY "budget_versions_delete" ON public.budget_versions
  FOR DELETE USING (
    public.is_super_admin() OR EXISTS (
      SELECT 1 FROM public.budgets b
      WHERE b.id = budget_versions.budget_id AND public.is_household_member(b.household_id)
    )
  );
