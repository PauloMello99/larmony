-- Fase 2 do import de extrato (docs/product/features/16-import-extrato.md,
-- ADR-0034 §"Tabelas novas"): memória de comerciante por lar. Guarda a
-- categoria que o usuário escolheu/corrigiu pra uma merchant_key normalizada
-- (statement_processor.rules.merchant_key) — alimenta context.merchantMemory
-- a cada chamada nova ao processor. RLS household-scoped, mesmo padrão de
-- "categories" (0000_baseline).
CREATE TABLE "merchant_category_memory" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"household_id" uuid NOT NULL,
	"merchant_key" text NOT NULL,
	"category_id" uuid NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "merchant_category_memory_household_id_merchant_key_unique" UNIQUE("household_id","merchant_key")
);
--> statement-breakpoint

ALTER TABLE "merchant_category_memory" ADD CONSTRAINT "merchant_category_memory_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "merchant_category_memory" ADD CONSTRAINT "merchant_category_memory_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint

CREATE INDEX "merchant_category_memory_household_idx" ON "merchant_category_memory" USING btree ("household_id");
--> statement-breakpoint

ALTER TABLE public.merchant_category_memory ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

CREATE POLICY "merchant_category_memory_select" ON public.merchant_category_memory
  FOR SELECT USING (public.is_super_admin() OR public.is_household_member(household_id));
--> statement-breakpoint
CREATE POLICY "merchant_category_memory_insert" ON public.merchant_category_memory
  FOR INSERT WITH CHECK (public.is_super_admin() OR public.is_household_member(household_id));
--> statement-breakpoint
CREATE POLICY "merchant_category_memory_update" ON public.merchant_category_memory
  FOR UPDATE USING (public.is_super_admin() OR public.is_household_member(household_id));
--> statement-breakpoint
CREATE POLICY "merchant_category_memory_delete" ON public.merchant_category_memory
  FOR DELETE USING (public.is_super_admin() OR public.is_household_member(household_id));
