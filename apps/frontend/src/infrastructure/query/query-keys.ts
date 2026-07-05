/**
 * Centralised query key factory.
 *
 * Shape: [domain, ...scope, operation?, params?]
 *
 * Broad invalidation: pass only the prefix that all affected keys share.
 * Example — invalidate all org-X members:
 *   queryClient.invalidateQueries({ queryKey: queryKeys.members.all(orgId) })
 */
export const queryKeys = {
  // ─── Current user ─────────────────────────────────────────────────────────
  me: ["me"] as const,

  // ─── Organizations ────────────────────────────────────────────────────────
  orgs: {
    /** Matches every orgs key (list + all detail entries) */
    all: ["orgs"] as const,
    /** All orgs belonging to the current user */
    list: () => ["orgs", "list"] as const,
    /** Single org by id */
    detail: (orgId: string) => ["orgs", "detail", orgId] as const,
    /** Single org resolved by slug (super_admin deep-link) */
    bySlug: (slug: string) => ["orgs", "by-slug", slug] as const,
  },

  // ─── Members & Invitations ─────────────────────────────────────────────────
  members: {
    /** Matches all member-related keys for an org */
    all: (orgId: string) => ["members", orgId] as const,
    /** Active member list */
    list: (orgId: string) => ["members", orgId, "list"] as const,
    /** Pending invitations */
    invitations: (orgId: string) => ["members", orgId, "invitations"] as const,
  },

  // ─── Admin (plataforma / super_admin) ──────────────────────────────────────
  admin: {
    all: ["admin"] as const,
    stats: () => ["admin", "stats"] as const,
    growth: () => ["admin", "stats", "growth"] as const,
    orgs: () => ["admin", "orgs"] as const,
    orgDetail: (id: string) => ["admin", "orgs", "detail", id] as const,
    users: () => ["admin", "users"] as const,
    userDetail: (id: string) => ["admin", "users", "detail", id] as const,
    auditLogs: (filters?: Record<string, unknown>) =>
      ["admin", "audit-logs", filters ?? {}] as const,
  },
} as const
