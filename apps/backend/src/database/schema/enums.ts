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

export const notificationTypeEnum = pgEnum("notification_type", [
  "bill_reminder",
  "invite_accepted",
  "goal_reached",
]);

export const auditActionEnum = pgEnum("audit_action", [
  "create",
  "update",
  "delete",
  "invite_sent",
  "invite_accepted",
  "subscription_changed",
]);
