import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import {
  subscriptionTypeEnum,
  subscriptionStatusEnum,
  billingIntervalEnum,
} from "./enums";
import { households } from "./households";

// Shell herdado da carcaça — billing fica fora do roadmap v1 (ADR-0015).
export const subscriptions = pgTable("subscriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  householdId: uuid("household_id")
    .unique()
    .notNull()
    .references(() => households.id, { onDelete: "cascade" }),
  stripeCustomerId: text("stripe_customer_id").unique(),
  stripeSubscriptionId: text("stripe_subscription_id").unique(),
  type: subscriptionTypeEnum("type").notNull().default("free"),
  status: subscriptionStatusEnum("status").notNull().default("active"),
  billingInterval: billingIntervalEnum("billing_interval"),
  priceCents: integer("price_cents"),
  trialEndsAt: timestamp("trial_ends_at", { withTimezone: true }),
  currentPeriodStart: timestamp("current_period_start", {
    withTimezone: true,
  }),
  currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
  gracePeriodDays: integer("grace_period_days").notNull().default(14),
  canceledAt: timestamp("canceled_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({
  household: one(households, {
    fields: [subscriptions.householdId],
    references: [households.id],
  }),
}));

export type Subscription = typeof subscriptions.$inferSelect;
export type NewSubscription = typeof subscriptions.$inferInsert;
