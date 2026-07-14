import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  index,
  unique,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { billingInvoiceEventTypeEnum } from "./enums";
import { households } from "./households";

// Espelho mínimo de invoice.paid/invoice.payment_failed (M15 PR2). Sem line
// items, sem dado de cartão — só o essencial pra KPIs reais de receita/falha
// de pagamento (minimização de dado sensível, mesma decisão de
// stripe_webhook_events, ver ADR-0026). unique(stripe_invoice_id, type) é a
// chave de idempotência do webhook.
export const billingInvoiceEvents = pgTable(
  "billing_invoice_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    stripeInvoiceId: text("stripe_invoice_id").notNull(),
    householdId: uuid("household_id").references(() => households.id, {
      onDelete: "set null",
    }),
    type: billingInvoiceEventTypeEnum("type").notNull(),
    amountCents: integer("amount_cents").notNull(),
    currency: text("currency").notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    unique("billing_invoice_events_invoice_type_unique").on(t.stripeInvoiceId, t.type),
    index("billing_invoice_events_occurred_at_idx").on(t.occurredAt),
  ],
);

export const billingInvoiceEventsRelations = relations(billingInvoiceEvents, ({ one }) => ({
  household: one(households, {
    fields: [billingInvoiceEvents.householdId],
    references: [households.id],
  }),
}));

export type BillingInvoiceEvent = typeof billingInvoiceEvents.$inferSelect;
export type NewBillingInvoiceEvent = typeof billingInvoiceEvents.$inferInsert;
