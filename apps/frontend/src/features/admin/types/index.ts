export type PlatformRole = "super_admin" | "user"

export interface PlatformStats {
  totalHouseholds: number
  suspendedHouseholds: number
  totalUsers: number
  superAdmins: number
  totalMemberships: number
}

/** Envelope de paginação das listas do admin (mesmo shape do audit-logs). */
export interface AdminPage<T> {
  data: T[]
  total: number
  page: number
  pages: number
}

export type SubscriptionPlanType = "free" | "trial" | "standard" | "custom"

export interface AdminHousehold {
  id: string
  name: string
  slug: string
  suspendedAt: string | null
  memberCount: number
  ownerName: string | null
  ownerEmail: string | null
  /** Plano efetivo (lar sem linha de subscription = "free"). */
  plan: SubscriptionPlanType
  subscriptionStatus: string | null
  createdAt: string
}

/** Filtros server-side da lista de lares. */
export interface AdminHouseholdFilters {
  page?: number
  limit?: number
  q?: string
  plan?: SubscriptionPlanType
  suspended?: boolean
  sortBy?: "createdAt" | "name" | "memberCount"
  sortDir?: "asc" | "desc"
}

/** Lar a que um usuário pertence (chips na lista de usuários). */
export interface AdminUserHouseholdChip {
  id: string
  name: string
  role: string
}

export interface AdminUser {
  id: string
  name: string
  email: string
  platformRole: PlatformRole
  householdCount: number
  households: AdminUserHouseholdChip[]
  createdAt: string
}

/** Filtros server-side da lista de usuários. */
export interface AdminUserFilters {
  page?: number
  limit?: number
  q?: string
  platformRole?: PlatformRole
  sortBy?: "createdAt" | "name" | "householdCount"
  sortDir?: "asc" | "desc"
}

/** Ponto da série de crescimento (novos por mês). */
export interface GrowthPoint {
  month: string
  newHouseholds: number
  newUsers: number
}

export interface AdminHouseholdMember {
  userId: string
  name: string
  email: string
  role: string
  enabled: boolean
  joinedAt: string
}

export interface AdminHouseholdInvitation {
  id: string
  email: string
  role: string
  createdAt: string
  expiresAt: string
}

/** Resumo da assinatura no drill-down (cache local; fonte = Stripe). */
export interface AdminHouseholdSubscription {
  type: SubscriptionPlanType
  status: string
  billingInterval: string | null
  priceCents: number | null
  currentPeriodEnd: string | null
  trialEndsAt: string | null
  discountPercent: number | null
  compReason: string | null
  compExpiresAt: string | null
  stripeCustomerId: string | null
  stripeSubscriptionId: string | null
}

export interface AdminHouseholdDetail {
  id: string
  name: string
  slug: string
  suspendedAt: string | null
  timezone: string
  notificationHour: number
  createdAt: string
  owner: { id: string; name: string; email: string } | null
  memberCount: number
  members: AdminHouseholdMember[]
  pendingInvitations: AdminHouseholdInvitation[]
  /** Null = lar nunca tocou billing (nem linha lazy) — efetivamente Free. */
  subscription: AdminHouseholdSubscription | null
}

// ── Abas de drill-down (read-only) ──────────────────────────────────────────

export interface AdminTransactionRow {
  id: string
  description: string
  type: string
  amountCents: number
  date: string
  categoryName: string | null
  categoryColor: string | null
  createdByName: string | null
  personName: string | null
  installmentNumber: number | null
  installmentCount: number | null
  isScheduled: boolean
  createdAt: string
}

export interface AdminCategoryRow {
  id: string
  name: string
  type: string
  color: string
  icon: string | null
  isDefault: boolean
  createdAt: string
}

export interface AdminBudgetRow {
  id: string
  categoryName: string
  categoryColor: string
  currentAmountCents: number | null
  endedFrom: string | null
  createdAt: string
}

export interface AdminGoalRow {
  id: string
  name: string
  targetAmountCents: number
  currentAmountCents: number
  targetDate: string | null
  color: string
  createdAt: string
}

export interface AdminScheduledEntryRow {
  id: string
  description: string
  type: string
  amountCents: number
  postingMode: string
  frequency: string
  interval: number
  startDate: string
  endDate: string | null
  nextRunDate: string | null
  isActive: boolean
  categoryName: string | null
  createdAt: string
}

export interface AdminNotificationRow {
  id: string
  userId: string
  userName: string | null
  type: string
  title: string
  body: string
  readAt: string | null
  createdAt: string
}

export interface AdminUserMembership {
  householdId: string
  householdName: string
  householdSlug: string
  role: string
  enabled: boolean
  joinedAt: string
}

export interface AdminUserDetail {
  id: string
  name: string
  email: string
  phone: string | null
  platformRole: PlatformRole
  createdAt: string
  memberships: AdminUserMembership[]
}

export type AuditAction =
  | "create"
  | "update"
  | "delete"
  | "invite_sent"
  | "invite_accepted"
  | "subscription_changed"

export interface AuditLogEntry {
  id: string
  actor: { id: string; name: string; email: string } | null
  household: { id: string; name: string; slug: string } | null
  action: AuditAction
  entityType: string
  entityId: string | null
  metadata: Record<string, unknown> | null
  createdAt: string
}

export interface AuditLogFilters {
  page?: number
  limit?: number
  householdId?: string
  actorId?: string
  action?: AuditAction
  entityType?: string
  from?: string
  to?: string
}

export interface AuditLogPage {
  data: AuditLogEntry[]
  total: number
  page: number
  pages: number
}

