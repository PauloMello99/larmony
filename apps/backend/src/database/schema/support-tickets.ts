import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { supportTicketStatusEnum, supportTicketCategoryEnum } from "./enums";
import { users } from "./users";
import { households } from "./households";

// Canal de suporte in-app (M15 PR3). Sem RLS — mesmo padrão de `notifications`:
// acesso sempre escopado no código (usuário só vê os próprios, admin vê todos
// via PlatformAdminGuard).
export const supportTickets = pgTable(
  "support_tickets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    householdId: uuid("household_id").references(() => households.id, {
      onDelete: "set null",
    }),
    category: supportTicketCategoryEnum("category").notNull(),
    status: supportTicketStatusEnum("status").notNull().default("open"),
    subject: text("subject").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("support_tickets_user_id_idx").on(t.userId),
    index("support_tickets_status_idx").on(t.status),
  ],
);

export const supportTicketMessages = pgTable(
  "support_ticket_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ticketId: uuid("ticket_id")
      .notNull()
      .references(() => supportTickets.id, { onDelete: "cascade" }),
    authorUserId: uuid("author_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    isAdmin: boolean("is_admin").notNull().default(false),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("support_ticket_messages_ticket_id_idx").on(t.ticketId)],
);

export const supportTicketsRelations = relations(supportTickets, ({ one, many }) => ({
  user: one(users, { fields: [supportTickets.userId], references: [users.id] }),
  household: one(households, {
    fields: [supportTickets.householdId],
    references: [households.id],
  }),
  messages: many(supportTicketMessages),
}));

export const supportTicketMessagesRelations = relations(supportTicketMessages, ({ one }) => ({
  ticket: one(supportTickets, {
    fields: [supportTicketMessages.ticketId],
    references: [supportTickets.id],
  }),
  author: one(users, {
    fields: [supportTicketMessages.authorUserId],
    references: [users.id],
  }),
}));

export type SupportTicket = typeof supportTickets.$inferSelect;
export type NewSupportTicket = typeof supportTickets.$inferInsert;
export type SupportTicketMessage = typeof supportTicketMessages.$inferSelect;
export type NewSupportTicketMessage = typeof supportTicketMessages.$inferInsert;
