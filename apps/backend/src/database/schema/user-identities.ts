import { pgTable, uuid, timestamp, unique } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { authProviderEnum } from "./enums";
import { users } from "./users";

/**
 * Vincula 1 usuário local (users.id) a N identidades de autenticação
 * Supabase — 1 por provedor usado (senha, Google, Apple). Substitui o
 * antigo 1:1 de users.auth_id (mantido como coluna legada até migration
 * futura de remoção — ver ADR-0032, adendo de múltiplas identidades).
 */
export const userIdentities = pgTable(
  "user_identities",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    provider: authProviderEnum("provider").notNull(),
    authId: uuid("auth_id").unique().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    unique("user_identities_user_id_provider_key").on(t.userId, t.provider),
  ],
);

export const userIdentitiesRelations = relations(
  userIdentities,
  ({ one }) => ({
    user: one(users, {
      fields: [userIdentities.userId],
      references: [users.id],
    }),
  }),
);

export type UserIdentity = typeof userIdentities.$inferSelect;
export type NewUserIdentity = typeof userIdentities.$inferInsert;
