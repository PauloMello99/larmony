export const ADMIN_REPOSITORY = Symbol("ADMIN_REPOSITORY");

export type PlatformRole = "super_admin" | "user";

/** Envelope de paginação das listas do painel (mesmo shape do AuditLogsPage). */
export interface Page<T> {
  data: T[];
  total: number;
  page: number;
  pages: number;
}

/** KPIs globais da plataforma (super_admin). */
export interface PlatformStats {
  totalHouseholds: number;
  suspendedHouseholds: number;
  totalUsers: number;
  superAdmins: number;
  totalMemberships: number;
}

/**
 * KPIs de billing (M15 PR2). `approxMrrCents` é aproximado — normaliza
 * `price_cents` pelo intervalo (monthly=1x, semiannual=/6, annual=/12) e
 * aplica `discount_percent` quando presente; não reflete cupons de valor fixo
 * nem parcelas em atraso. `newSubscriptions`/`canceledSubscriptions` no
 * `BillingGrowthPoint` vêm da tabela de estado (`created_at`/`updated_at`),
 * não de um event log — aproximado até o espelho de invoices (PR2 commit 2)
 * alimentar `revenueCents`/`failedPayments` com dados reais.
 */
export interface BillingStats {
  payingActive: number;
  trialing: number;
  pastDue: number;
  comp: number;
  free: number;
  canceled: number;
  approxMrrCents: number;
  planDistribution: { plan: string; count: number }[];
}

export interface BillingGrowthPoint {
  /** Mês no formato "YYYY-MM". */
  month: string;
  newSubscriptions: number;
  canceledSubscriptions: number;
}

/**
 * Filtro da lista de lares. `q` cobre nome/slug do lar e e-mail do dono num
 * input só; `plan` trata lar sem linha de subscription como "free".
 */
export interface ListHouseholdsFilter {
  page?: number;
  limit?: number;
  q?: string;
  plan?: "free" | "trial" | "standard" | "custom";
  status?: "active" | "trialing" | "past_due" | "canceled";
  suspended?: boolean;
  sortBy?: "createdAt" | "name" | "memberCount";
  sortDir?: "asc" | "desc";
}

/** Linha de lar no painel da plataforma. */
export interface AdminHouseholdRow {
  id: string;
  name: string;
  slug: string;
  suspendedAt: Date | null;
  memberCount: number;
  ownerName: string | null;
  ownerEmail: string | null;
  /** Plano efetivo (lar sem subscription = "free"). */
  plan: "free" | "trial" | "standard" | "custom";
  subscriptionStatus: string | null;
  createdAt: Date;
}

/** Filtro da lista de usuários. */
export interface ListUsersFilter {
  page?: number;
  limit?: number;
  q?: string;
  platformRole?: PlatformRole;
  sortBy?: "createdAt" | "name" | "householdCount";
  sortDir?: "asc" | "desc";
}

/** Lar a que um usuário pertence, na linha da lista de usuários. */
export interface AdminUserHouseholdChip {
  id: string;
  name: string;
  role: string;
}

/** Linha de usuário no painel da plataforma. */
export interface AdminUserRow {
  id: string;
  name: string;
  email: string;
  platformRole: PlatformRole;
  householdCount: number;
  households: AdminUserHouseholdChip[];
  createdAt: Date;
}

/** Ponto da série de crescimento da plataforma (novos por mês). */
export interface GrowthPoint {
  /** Mês no formato "YYYY-MM". */
  month: string;
  newHouseholds: number;
  newUsers: number;
}

/** Membro de uma household no detalhe da plataforma. */
export interface AdminHouseholdMember {
  userId: string;
  name: string;
  email: string;
  /** household_role: "owner" | "member". */
  role: string;
  enabled: boolean;
  joinedAt: Date;
}

/** Convite pendente no detalhe da household. */
export interface AdminHouseholdInvitation {
  id: string;
  email: string;
  role: string;
  createdAt: Date;
  expiresAt: Date;
}

/** Resumo da assinatura no drill-down do lar (cache local; fonte = Stripe). */
export interface AdminHouseholdSubscription {
  type: "free" | "trial" | "standard" | "custom";
  status: string;
  billingInterval: string | null;
  priceCents: number | null;
  currentPeriodEnd: Date | null;
  trialEndsAt: Date | null;
  discountPercent: number | null;
  compReason: string | null;
  compExpiresAt: Date | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
}

/** Detalhe de uma lar (drill-down). */
export interface AdminHouseholdDetail {
  id: string;
  name: string;
  slug: string;
  suspendedAt: Date | null;
  timezone: string;
  notificationHour: number;
  createdAt: Date;
  owner: { id: string; name: string; email: string } | null;
  memberCount: number;
  members: AdminHouseholdMember[];
  pendingInvitations: AdminHouseholdInvitation[];
  /** Null = lar nunca tocou billing (nem linha lazy) — efetivamente Free. */
  subscription: AdminHouseholdSubscription | null;
}

/** Paginação simples das abas de drill-down. */
export interface PageFilter {
  page?: number;
  limit?: number;
}

/** Transação na aba Finanças do drill-down (read-only, para investigação). */
export interface AdminTransactionRow {
  id: string;
  description: string;
  type: string;
  amountCents: number;
  date: string;
  categoryName: string | null;
  categoryColor: string | null;
  createdByName: string | null;
  personName: string | null;
  installmentNumber: number | null;
  installmentCount: number | null;
  /** Gerada por lançamento programado (engine), não criada à mão. */
  isScheduled: boolean;
  createdAt: Date;
}

export interface ListHouseholdTransactionsFilter extends PageFilter {
  from?: string;
  to?: string;
  type?: "income" | "expense";
}

export interface AdminCategoryRow {
  id: string;
  name: string;
  type: string;
  color: string;
  icon: string | null;
  isDefault: boolean;
  createdAt: Date;
}

/** Série de orçamento com o limite vigente (versão de maior effective_from <= hoje). */
export interface AdminBudgetRow {
  id: string;
  categoryName: string;
  categoryColor: string;
  currentAmountCents: number | null;
  endedFrom: string | null;
  createdAt: Date;
}

export interface AdminGoalRow {
  id: string;
  name: string;
  targetAmountCents: number;
  /** Derivado: SUM das contribuições. */
  currentAmountCents: number;
  targetDate: string | null;
  color: string;
  createdAt: Date;
}

export interface AdminScheduledEntryRow {
  id: string;
  description: string;
  type: string;
  amountCents: number;
  postingMode: string;
  frequency: string;
  interval: number;
  startDate: string;
  endDate: string | null;
  nextRunDate: string | null;
  isActive: boolean;
  categoryName: string | null;
  createdAt: Date;
}

/** Notificação entregue a um membro do lar (aba Notificações). */
export interface AdminNotificationRow {
  id: string;
  userId: string;
  userName: string | null;
  type: string;
  title: string;
  body: string;
  readAt: Date | null;
  createdAt: Date;
}

export interface ListHouseholdNotificationsFilter extends PageFilter {
  type?: string;
}

/** Membership de um usuário no detalhe (drill-down). */
export interface AdminUserMembership {
  householdId: string;
  householdName: string;
  householdSlug: string;
  role: string;
  enabled: boolean;
  joinedAt: Date;
}

/** Detalhe de um usuário (drill-down). */
export interface AdminUserDetail {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  platformRole: PlatformRole;
  createdAt: Date;
  memberships: AdminUserMembership[];
}

export interface IAdminRepository {
  getStats(): Promise<PlatformStats>;
  /** Novos households/users por mês nos últimos 12 meses (meses vazios incluídos). */
  getGrowthSeries(): Promise<GrowthPoint[]>;
  getBillingStats(): Promise<BillingStats>;
  /** Novas/canceladas por mês nos últimos 12 meses (aproximado — ver BillingGrowthPoint). */
  getBillingGrowthSeries(): Promise<BillingGrowthPoint[]>;
  listHouseholds(filter: ListHouseholdsFilter): Promise<Page<AdminHouseholdRow>>;
  listUsers(filter: ListUsersFilter): Promise<Page<AdminUserRow>>;
  /** Detalhe de uma household (membros + convites + assinatura). Null se não existe. */
  getHouseholdDetail(householdId: string): Promise<AdminHouseholdDetail | null>;
  /** Existência barata para o 404 das abas de drill-down. */
  householdExists(householdId: string): Promise<boolean>;
  listHouseholdTransactions(
    householdId: string,
    filter: ListHouseholdTransactionsFilter,
  ): Promise<Page<AdminTransactionRow>>;
  listHouseholdCategories(householdId: string, filter: PageFilter): Promise<Page<AdminCategoryRow>>;
  listHouseholdBudgets(householdId: string, filter: PageFilter): Promise<Page<AdminBudgetRow>>;
  listHouseholdGoals(householdId: string, filter: PageFilter): Promise<Page<AdminGoalRow>>;
  listHouseholdScheduledEntries(
    householdId: string,
    filter: PageFilter,
  ): Promise<Page<AdminScheduledEntryRow>>;
  listHouseholdNotifications(
    householdId: string,
    filter: ListHouseholdNotificationsFilter,
  ): Promise<Page<AdminNotificationRow>>;
  /** Detalhe de um usuário (memberships). Null se não existe. */
  getUserDetail(userId: string): Promise<AdminUserDetail | null>;
  /** Marca/desmarca a household como suspensa. Retorna false se a household não existe. */
  setHouseholdSuspended(householdId: string, suspended: boolean): Promise<boolean>;
  /** Estado de billing do lar p/ a política de suspensão. Null = sem linha de subscription. */
  getHouseholdBillingState(
    householdId: string,
  ): Promise<{ stripeSubscriptionId: string | null; type: string; status: string } | null>;
  /**
   * Espelha localmente o cancelamento feito no Stripe pela suspensão (o webhook
   * `customer.subscription.deleted` segue idempotente por cima).
   */
  markSubscriptionCanceled(householdId: string): Promise<void>;
}
