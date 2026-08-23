import { pgTable, uuid, text, timestamp, unique } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { households } from "../households";
import { categories } from "./categories";

// Fase 2 do import de extrato (docs/product/features/16-import-extrato.md,
// ADR-0034 §"Tabelas novas"): categoria que o usuário escolheu/corrigiu pra
// uma merchant_key normalizada (statement_processor.rules.merchant_key).
// Alimenta context.merchantMemory a cada chamada nova ao processor Python.
export const merchantCategoryMemory = pgTable(
  "merchant_category_memory",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    householdId: uuid("household_id")
      .notNull()
      .references(() => households.id, { onDelete: "cascade" }),
    merchantKey: text("merchant_key").notNull(),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    // Sem índice extra em (household_id) sozinho — o índice único do
    // constraint abaixo já cobre esse prefixo (achado do database-guardian).
    unique().on(t.householdId, t.merchantKey),
  ],
);

export const merchantCategoryMemoryRelations = relations(
  merchantCategoryMemory,
  ({ one }) => ({
    household: one(households, {
      fields: [merchantCategoryMemory.householdId],
      references: [households.id],
    }),
    category: one(categories, {
      fields: [merchantCategoryMemory.categoryId],
      references: [categories.id],
    }),
  }),
);

export type MerchantCategoryMemory = typeof merchantCategoryMemory.$inferSelect;
export type NewMerchantCategoryMemory = typeof merchantCategoryMemory.$inferInsert;
