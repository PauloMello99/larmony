import { pgTable, uuid, text, timestamp, unique } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { notificationTypeEnum } from "./enums";
import { households } from "./households";

// Marcador "já disparei este evento neste contexto" (M11) — por EVENTO, nunca
// por usuário: dedup é household-scoped (1× por meta, 1× por orçamento×mês,
// 1× por relatório×mês); o fan-out por destinatário é ortogonal e não entra
// na chave. Escrito ANTES do dispatch (mesmo princípio de
// reminder_last_sent_at). Mantém goals/budgets sem coluna de notificação.
export const notificationDedup = pgTable(
  "notification_dedup",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    householdId: uuid("household_id")
      .notNull()
      .references(() => households.id, { onDelete: "cascade" }),
    eventType: notificationTypeEnum("event_type").notNull(),
    // Id do registro-fonte do evento (budget series id, goal id, household id
    // para o relatório mensal) — não é FK física (contextos heterogêneos).
    contextId: uuid("context_id").notNull(),
    // "once" (1×/vida, ex. meta) ou "YYYY-MM" (1×/mês, ex. orçamento/relatório).
    periodKey: text("period_key").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [unique().on(t.eventType, t.contextId, t.periodKey)],
);

export const notificationDedupRelations = relations(
  notificationDedup,
  ({ one }) => ({
    household: one(households, {
      fields: [notificationDedup.householdId],
      references: [households.id],
    }),
  }),
);

export type NotificationDedup = typeof notificationDedup.$inferSelect;
export type NewNotificationDedup = typeof notificationDedup.$inferInsert;
