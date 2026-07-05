import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  unique,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { householdRoleEnum, invitationStatusEnum } from "./enums";

export const households = pgTable("households", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").unique().notNull(),
  logoUrl: text("logo_url"),
  // Suspensão pelo super_admin (plataforma): NULL = ativo; preenchido = acesso bloqueado.
  suspendedAt: timestamp("suspended_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const householdMemberships = pgTable(
  "household_memberships",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    householdId: uuid("household_id")
      .notNull()
      .references(() => households.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull(),
    role: householdRoleEnum("role").notNull().default("member"),
    // Reservado (v1 não usa permissões por módulo — ver ADR-0015).
    permissions: text("permissions").array().notNull().default([]),
    // Membro inativo perde acesso ao lar (HouseholdMembershipGuard exige enabled).
    enabled: boolean("enabled").notNull().default(true),
    joinedAt: timestamp("joined_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [unique().on(t.householdId, t.userId)],
);

export const householdInvitations = pgTable(
  "household_invitations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    householdId: uuid("household_id")
      .notNull()
      .references(() => households.id, { onDelete: "cascade" }),
    invitedBy: uuid("invited_by").notNull(),
    email: text("email").notNull(),
    role: householdRoleEnum("role").notNull().default("member"),
    token: text("token")
      .unique()
      .notNull()
      .default(sql`encode(gen_random_bytes(32), 'hex')`),
    status: invitationStatusEnum("status").notNull().default("pending"),
    expiresAt: timestamp("expires_at", { withTimezone: true })
      .notNull()
      .default(sql`now() + interval '7 days'`),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [unique().on(t.householdId, t.email)],
);

export const householdsRelations = relations(households, ({ many }) => ({
  memberships: many(householdMemberships),
  invitations: many(householdInvitations),
}));

export const householdMembershipsRelations = relations(
  householdMemberships,
  ({ one }) => ({
    household: one(households, {
      fields: [householdMemberships.householdId],
      references: [households.id],
    }),
  }),
);

export const householdInvitationsRelations = relations(
  householdInvitations,
  ({ one }) => ({
    household: one(households, {
      fields: [householdInvitations.householdId],
      references: [households.id],
    }),
  }),
);

export type Household = typeof households.$inferSelect;
export type NewHousehold = typeof households.$inferInsert;
export type HouseholdMembership = typeof householdMemberships.$inferSelect;
export type NewHouseholdMembership = typeof householdMemberships.$inferInsert;
export type HouseholdInvitation = typeof householdInvitations.$inferSelect;
export type NewHouseholdInvitation = typeof householdInvitations.$inferInsert;
