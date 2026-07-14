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

/** Detalhe de uma lar (drill-down). */
export interface AdminHouseholdDetail {
  id: string;
  name: string;
  slug: string;
  suspendedAt: Date | null;
  stockCheckIntervalDays: number | null;
  createdAt: Date;
  owner: { id: string; name: string; email: string } | null;
  memberCount: number;
  members: AdminHouseholdMember[];
  pendingInvitations: AdminHouseholdInvitation[];
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
  listHouseholds(filter: ListHouseholdsFilter): Promise<Page<AdminHouseholdRow>>;
  listUsers(filter: ListUsersFilter): Promise<Page<AdminUserRow>>;
  /** Detalhe de uma household (membros + convites). Null se não existe. */
  getHouseholdDetail(householdId: string): Promise<AdminHouseholdDetail | null>;
  /** Detalhe de um usuário (memberships). Null se não existe. */
  getUserDetail(userId: string): Promise<AdminUserDetail | null>;
  /** Marca/desmarca a household como suspensa. Retorna false se a household não existe. */
  setHouseholdSuspended(householdId: string, suspended: boolean): Promise<boolean>;
  /** Define o platform_role de um usuário. Retorna false se o usuário não existe. */
  setUserPlatformRole(userId: string, role: PlatformRole): Promise<boolean>;
  /** Usuário pelo id da app (para checagens de auto-rebaixamento). */
  findUserById(
    userId: string,
  ): Promise<{ id: string; authId: string; platformRole: PlatformRole } | null>;
}
