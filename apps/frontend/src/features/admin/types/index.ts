export type PlatformRole = "super_admin" | "user"

export interface PlatformStats {
  totalHouseholds: number
  suspendedHouseholds: number
  totalUsers: number
  superAdmins: number
  totalMemberships: number
}

export interface AdminHousehold {
  id: string
  name: string
  slug: string
  suspendedAt: string | null
  memberCount: number
  ownerName: string | null
  createdAt: string
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

/** Filtros/ordenação client-side das tabelas. */
export type HouseholdStatusFilter = "all" | "active" | "suspended"
export type UserRoleFilter = "all" | "super_admin" | "user"
export type HouseholdSortKey = "name" | "createdAt" | "memberCount"
export type UserSortKey = "name" | "createdAt" | "householdCount"
export type SortDir = "asc" | "desc"
