import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  smallint,
  boolean,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import {
  subscriptionTypeEnum,
  subscriptionStatusEnum,
  billingIntervalEnum,
  subscriptionTierEnum,
} from "./enums";
import { households } from "./households";
import { users } from "./users";

// Shell herdado da carcaça — billing fica fora do roadmap v1 (ADR-0015).
// Estendido no M14 (ADR-0026) com colunas de desconto/isenção administrativa.
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
  // Tier do plano pago (M16). Null quando não há plano pago (locked/comp);
  // resolvido a partir do lookup_key do Price no sync com o Stripe.
  tier: subscriptionTierEnum("tier"),
  // 1 trial por lar (M16): setado true ao iniciar o trial no checkout; impede
  // um 2º trial self-serve no mesmo lar.
  trialConsumed: boolean("trial_consumed").notNull().default(false),
  billingInterval: billingIntervalEnum("billing_interval"),
  priceCents: integer("price_cents"),
  trialEndsAt: timestamp("trial_ends_at", { withTimezone: true }),
  currentPeriodStart: timestamp("current_period_start", {
    withTimezone: true,
  }),
  currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
  gracePeriodDays: integer("grace_period_days").notNull().default(14),
  canceledAt: timestamp("canceled_at", { withTimezone: true }),
  // Desconto (M14, ADR-0026): sempre um Coupon do Stripe (criado/anexado pela
  // nossa API); estas colunas são cache local só para exibição no admin.
  stripePriceId: text("stripe_price_id"),
  stripeCouponId: text("stripe_coupon_id"),
  discountPercent: smallint("discount_percent"),
  // Isenção/comp (M14, ADR-0026): 100% local, nunca toca o Stripe.
  compReason: text("comp_reason"),
  compGrantedBy: uuid("comp_granted_by").references(() => users.id, {
    onDelete: "set null",
  }),
  compExpiresAt: timestamp("comp_expires_at", { withTimezone: true }),
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
  compGrantedByUser: one(users, {
    fields: [subscriptions.compGrantedBy],
    references: [users.id],
  }),
}));

export type Subscription = typeof subscriptions.$inferSelect;
export type NewSubscription = typeof subscriptions.$inferInsert;
