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

export interface AdminUser {
  id: string
  name: string
  email: string
  platformRole: PlatformRole
  householdCount: number
  createdAt: string
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

export interface AdminHouseholdDetail {
  id: string
  name: string
  slug: string
  suspendedAt: string | null
  stockCheckIntervalDays: number | null
  createdAt: string
  owner: { id: string; name: string; email: string } | null
  memberCount: number
  members: AdminHouseholdMember[]
  pendingInvitations: AdminHouseholdInvitation[]
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

/** Filtros/ordenação client-side remanescentes (users migra no M15 8/8). */
export type UserRoleFilter = "all" | "super_admin" | "user"
export type UserSortKey = "name" | "createdAt" | "householdCount"
export type SortDir = "asc" | "desc"
