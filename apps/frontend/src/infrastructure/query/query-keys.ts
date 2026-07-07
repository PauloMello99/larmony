/**
 * Centralised query key factory.
 *
 * Shape: [domain, ...scope, operation?, params?]
 *
 * Broad invalidation: pass only the prefix that all affected keys share.
 * Example — invalidate all household-X members:
 *   queryClient.invalidateQueries({ queryKey: queryKeys.members.all(householdId) })
 */
export const queryKeys = {
  // ─── Current user ─────────────────────────────────────────────────────────
  me: ["me"] as const,

  // ─── Households ────────────────────────────────────────────────────────
  households: {
    /** Matches every households key (list + all detail entries) */
    all: ["households"] as const,
    /** All households belonging to the current user */
    list: () => ["households", "list"] as const,
    /** Single household by id */
    detail: (householdId: string) => ["households", "detail", householdId] as const,
    /** Single household resolved by slug (super_admin deep-link) */
    bySlug: (slug: string) => ["households", "by-slug", slug] as const,
    /** KPIs do dashboard (mês corrente/anterior, metas, contas, orçamentos) */
    overview: (householdId: string) => ["households", "overview", householdId] as const,
  },

  // ─── Members & Invitations ─────────────────────────────────────────────────
  members: {
    /** Matches all member-related keys for an household */
    all: (householdId: string) => ["members", householdId] as const,
    /** Active member list */
    list: (householdId: string) => ["members", householdId, "list"] as const,
    /** Pending invitations */
    invitations: (householdId: string) => ["members", householdId, "invitations"] as const,
  },

  // ─── Categories ─────────────────────────────────────────────────────────
  categories: {
    all: (householdId: string) => ["categories", householdId] as const,
    list: (householdId: string) => ["categories", householdId, "list"] as const,
  },

  // ─── Transactions ───────────────────────────────────────────────────────
  transactions: {
    all: (householdId: string) => ["transactions", householdId] as const,
    list: (householdId: string, filters?: Record<string, unknown>) =>
      ["transactions", householdId, "list", filters ?? {}] as const,
    /** Rateio de uma transação — aninhado sob o prefixo do lar. */
    members: (householdId: string, transactionId: string) =>
      ["transactions", householdId, "members", transactionId] as const,
  },

  // ─── Budgets ────────────────────────────────────────────────────────────
  budgets: {
    all: (householdId: string) => ["budgets", householdId] as const,
    list: (householdId: string, filters?: Record<string, unknown>) =>
      ["budgets", householdId, "list", filters ?? {}] as const,
  },

  // ─── Bills ──────────────────────────────────────────────────────────────
  bills: {
    all: (householdId: string) => ["bills", householdId] as const,
    list: (householdId: string) => ["bills", householdId, "list"] as const,
  },

  // ─── Goals ──────────────────────────────────────────────────────────────
  goals: {
    all: (householdId: string) => ["goals", householdId] as const,
    list: (householdId: string) => ["goals", householdId, "list"] as const,
    /** Aninhada sob o prefixo do lar — `goals.all` invalida o histórico junto. */
    contributions: (householdId: string, goalId: string) =>
      ["goals", householdId, "contributions", goalId] as const,
  },

  // ─── Admin (plataforma / super_admin) ──────────────────────────────────────
  admin: {
    all: ["admin"] as const,
    stats: () => ["admin", "stats"] as const,
    growth: () => ["admin", "stats", "growth"] as const,
    households: () => ["admin", "households"] as const,
    householdDetail: (id: string) => ["admin", "households", "detail", id] as const,
    users: () => ["admin", "users"] as const,
    userDetail: (id: string) => ["admin", "users", "detail", id] as const,
    auditLogs: (filters?: Record<string, unknown>) =>
      ["admin", "audit-logs", filters ?? {}] as const,
  },
} as const
