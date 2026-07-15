import { pgTable, uuid, text, timestamp, boolean, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { categoryTypeEnum } from "../enums";
import { households } from "../households";

// Categorias de transações/orçamentos/contas. As 13 defaults são semeadas por
// use-case na criação do household (não por trigger — ver domain-rules).
export const categories = pgTable(
  "categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    householdId: uuid("household_id")
      .notNull()
      .references(() => households.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    type: categoryTypeEnum("type").notNull().default("expense"),
    // Hex (#RRGGBB) para identificação visual.
    color: text("color").notNull().default("#8b8b8b"),
    // Nome de ícone lucide (ex.: "UtensilsCrossed").
    icon: text("icon"),
    isDefault: boolean("is_default").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("categories_household_idx").on(t.householdId)],
);

export const categoriesRelations = relations(categories, ({ one }) => ({
  household: one(households, {
    fields: [categories.householdId],
    references: [households.id],
  }),
}));

export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;
