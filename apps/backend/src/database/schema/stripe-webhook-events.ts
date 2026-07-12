import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

// Idempotência do webhook do Stripe (M14, ADR-0026). `id` = event.id do
// Stripe: a própria PK garante "insere-uma-vez" (conflito na inserção =
// evento já processado). Sem GRANT/RLS de propósito — só DRIZZLE_ADMIN toca
// (mesmo padrão de `notification_dedup`); payload completo não é persistido
// por minimização de dado sensível de pagamento (reprocessamento busca o
// evento fresco na API do Stripe pelo id).
export const stripeWebhookEvents = pgTable("stripe_webhook_events", {
  id: text("id").primaryKey(),
  type: text("type").notNull(),
  receivedAt: timestamp("received_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  processedAt: timestamp("processed_at", { withTimezone: true }),
});

export type StripeWebhookEvent = typeof stripeWebhookEvents.$inferSelect;
export type NewStripeWebhookEvent = typeof stripeWebhookEvents.$inferInsert;
