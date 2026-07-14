import { pgEnum } from "drizzle-orm/pg-core";

export const platformRoleEnum = pgEnum("platform_role", [
  "super_admin",
  "user",
]);

export const householdRoleEnum = pgEnum("household_role", ["owner", "member"]);

export const invitationStatusEnum = pgEnum("invitation_status", [
  "pending",
  "accepted",
  "expired",
  "cancelled",
]);

export const subscriptionTypeEnum = pgEnum("subscription_type", [
  "free",
  "trial",
  "standard",
  "custom",
]);

export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "active",
  "trialing",
  "past_due",
  "canceled",
]);

export const billingIntervalEnum = pgEnum("billing_interval", [
  "monthly",
  "semiannual",
  "annual",
]);

export const billingInvoiceEventTypeEnum = pgEnum("billing_invoice_event_type", [
  "paid",
  "payment_failed",
]);

export const transactionTypeEnum = pgEnum("transaction_type", [
  "income",
  "expense",
]);

export const categoryTypeEnum = pgEnum("category_type", [
  "income",
  "expense",
  "both",
]);

// Periodicidade de um lançamento programado. "a cada N períodos" via
// coluna `interval`; cobre quinzenal (weekly×2), trimestral/semestral (monthly×N).
export const recurrenceFrequencyEnum = pgEnum("recurrence_frequency", [
  "weekly",
  "monthly",
  "yearly",
]);

// Modo de postagem de um lançamento programado (ADR-0020, unifica bills+recurrences):
// `auto` = o engine do cron gera a transação automaticamente na ocorrência;
// `manual` = lembrete por e-mail + lançamento manual (valor confirmado pelo usuário).
export const scheduledPostingModeEnum = pgEnum("scheduled_posting_mode", [
  "auto",
  "manual",
]);

export const genderEnum = pgEnum("gender", ["male", "female", "other"]);

// "Event key" único, reusado por inbox in-app + preferências + dispatcher
// (M11) — evita um 2º enum para o mesmo conceito.
export const notificationTypeEnum = pgEnum("notification_type", [
  "bill_reminder",
  "invite_accepted",
  "goal_reached",
  "auto_launch",
  "budget_exceeded",
  "monthly_report",
]);

// Canais configuráveis pelo usuário (M11). In-app NÃO entra aqui — é sempre
// gravado, nunca opcional (ver notification_preferences).
export const notificationChannelEnum = pgEnum("notification_channel", [
  "email",
  "sms",
  "whatsapp",
]);

export const auditActionEnum = pgEnum("audit_action", [
  "create",
  "update",
  "delete",
  "invite_sent",
  "invite_accepted",
  "subscription_changed",
]);
