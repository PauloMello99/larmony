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

  // ─── Preferências de notificação (M11) ─────────────────────────────────
  notificationPreferences: {
    all: ["notification-preferences"] as const,
  },

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

  // ─── Lançamentos programados (ADR-0020 — unifica bills + recurrences) ───────
  scheduledTransactions: {
    all: (householdId: string) => ["scheduled-transactions", householdId] as const,
    list: (householdId: string) => ["scheduled-transactions", householdId, "list"] as const,
  },

  // ─── Goals ──────────────────────────────────────────────────────────────
  goals: {
    all: (householdId: string) => ["goals", householdId] as const,
    list: (householdId: string) => ["goals", householdId, "list"] as const,
    /** Aninhada sob o prefixo do lar — `goals.all` invalida o histórico junto. */
    contributions: (householdId: string, goalId: string) =>
      ["goals", householdId, "contributions", goalId] as const,
  },

  // ─── Reports ────────────────────────────────────────────────────────────
  reports: {
    all: (householdId: string) => ["reports", householdId] as const,
    monthly: (householdId: string, year: number, month: number) =>
      ["reports", householdId, "monthly", year, month] as const,
    annual: (householdId: string, year: number) =>
      ["reports", householdId, "annual", year] as const,
  },

  // ─── Subscription / entitlements (M14, billing) ────────────────────────────
  subscription: {
    detail: (householdId: string) => ["subscription", householdId] as const,
  },

  // ─── Statement imports (importação de extrato CSV/OFX) ─────────────────────
  statementImports: {
    all: (householdId: string) => ["statement-imports", householdId] as const,
    job: (householdId: string, jobId: string) =>
      ["statement-imports", householdId, "job", jobId] as const,
    candidates: (householdId: string, jobId: string) =>
      ["statement-imports", householdId, "candidates", jobId] as const,
  },

  // ─── Admin (plataforma / super_admin) ──────────────────────────────────────
  admin: {
    all: ["admin"] as const,
    stats: () => ["admin", "stats"] as const,
    growth: () => ["admin", "stats", "growth"] as const,
    billingStats: () => ["admin", "stats", "billing"] as const,
    billingGrowth: () => ["admin", "stats", "billing", "growth"] as const,
    households: (filters?: Record<string, unknown>) =>
      ["admin", "households", filters ?? {}] as const,
    householdDetail: (id: string) => ["admin", "households", "detail", id] as const,
    householdTab: (id: string, tab: string, params?: Record<string, unknown>) =>
      ["admin", "households", "detail", id, tab, params ?? {}] as const,
    users: (filters?: Record<string, unknown>) => ["admin", "users", filters ?? {}] as const,
    userDetail: (id: string) => ["admin", "users", "detail", id] as const,
    auditLogs: (filters?: Record<string, unknown>) =>
      ["admin", "audit-logs", filters ?? {}] as const,
    supportTickets: (filters?: Record<string, unknown>) =>
      ["admin", "support-tickets", filters ?? {}] as const,
    supportTicketDetail: (id: string) => ["admin", "support-tickets", "detail", id] as const,
  },

  // ─── Suporte in-app (M15 PR3) ───────────────────────────────────────────────
  support: {
    all: ["support"] as const,
    list: (filters?: Record<string, unknown>) => ["support", "list", filters ?? {}] as const,
    detail: (id: string) => ["support", "detail", id] as const,
  },
} as const
