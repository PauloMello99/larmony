import { pgTable, uuid, text, timestamp, date, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { platformRoleEnum, genderEnum } from "./enums";
import { householdMemberships } from "./households";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  authId: uuid("auth_id").unique().notNull(),
  platformRole: platformRoleEnum("platform_role").notNull().default("user"),
  name: text("name").notNull(),
  email: text("email").unique().notNull(),
  phone: text("phone"),
  avatarUrl: text("avatar_url"),
  birthDate: date("birth_date"),
  gender: genderEnum("gender"),
  // Idioma da UI, das notificações e dos e-mails (ADR-0018): pt-BR (default) | en | es.
  locale: text("locale").notNull().default("pt-BR"),
  // Tours de onboarding já concluídos: mapa { [tourKey]: maiorVersãoVista }.
  onboarding: jsonb("onboarding")
    .$type<Record<string, number>>()
    .notNull()
    .default({}),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const usersRelations = relations(users, ({ many }) => ({
  memberships: many(householdMemberships),
}));

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
