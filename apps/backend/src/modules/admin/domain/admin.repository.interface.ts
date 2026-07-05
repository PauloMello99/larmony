export const ADMIN_REPOSITORY = Symbol("ADMIN_REPOSITORY");

export type PlatformRole = "super_admin" | "user";

/** KPIs globais da plataforma (super_admin). */
export interface PlatformStats {
  totalHouseholds: number;
  suspendedHouseholds: number;
  totalUsers: number;
  superAdmins: number;
  totalMemberships: number;
}

/** Linha de lar no painel da plataforma. */
export interface AdminHouseholdRow {
  id: string;
  name: string;
  slug: string;
  suspendedAt: Date | null;
  memberCount: number;
  ownerName: string | null;
  createdAt: Date;
}

/** Linha de usuário no painel da plataforma. */
export interface AdminUserRow {
  id: string;
  name: string;
  email: string;
  platformRole: PlatformRole;
  householdCount: number;
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
  listHouseholds(): Promise<AdminHouseholdRow[]>;
  listUsers(): Promise<AdminUserRow[]>;
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
