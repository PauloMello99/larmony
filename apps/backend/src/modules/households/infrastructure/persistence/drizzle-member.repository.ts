import { Inject, Injectable } from "@nestjs/common";
import { eq, and } from "drizzle-orm";
import {
  DRIZZLE,
  DRIZZLE_ADMIN,
  requestMemo,
  type DrizzleDB,
} from "../../../../database/database.module";
import * as schema from "../../../../database/schema";
import { isSuperAdmin } from "../../../../common/auth/is-super-admin";
import type {
  IMemberRepository,
  UpsertMembershipData,
} from "../../domain/member.repository.interface";
import type { MemberEntity } from "../../domain/member.entity";
import type { HouseholdRole } from "../../domain/household.entity";
import { MemberMapper } from "./member.mapper";

@Injectable()
export class DrizzleMemberRepository implements IMemberRepository {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    // upsert() roda no aceite de convite, antes de o usuário ser membro → bypass RLS.
    @Inject(DRIZZLE_ADMIN) private readonly admin: DrizzleDB,
  ) {}

  async upsert(data: UpsertMembershipData): Promise<void> {
    await this.admin
      .insert(schema.householdMemberships)
      .values({
        householdId: data.householdId,
        userId: data.userId,
        role: data.role,
        permissions: data.permissions ?? [],
        enabled: true,
      })
      .onConflictDoUpdate({
        target: [schema.householdMemberships.householdId, schema.householdMemberships.userId],
        // Re-aceite preserva as permissões já configuradas (só reativa).
        set: { role: data.role, enabled: true },
      });
  }

  async updatePermissions(
    memberId: string,
    permissions: string[],
  ): Promise<MemberEntity> {
    await this.db
      .update(schema.householdMemberships)
      .set({ permissions })
      .where(eq(schema.householdMemberships.id, memberId));

    const [row] = await this.db
      .select({
        memberId: schema.householdMemberships.id,
        householdId: schema.householdMemberships.householdId,
        userId: schema.householdMemberships.userId,
        role: schema.householdMemberships.role,
        enabled: schema.householdMemberships.enabled,
        permissions: schema.householdMemberships.permissions,
        userName: schema.users.name,
        userEmail: schema.users.email,
        joinedAt: schema.householdMemberships.joinedAt,
      })
      .from(schema.householdMemberships)
      .innerJoin(schema.users, eq(schema.users.id, schema.householdMemberships.userId))
      .where(eq(schema.householdMemberships.id, memberId))
      .limit(1);

    if (!row) throw new Error("Member not found after update");
    return MemberMapper.toDomain(row);
  }

  async findAllByHousehold(householdId: string): Promise<MemberEntity[]> {
    const rows = await this.db
      .select({
        memberId: schema.householdMemberships.id,
        householdId: schema.householdMemberships.householdId,
        userId: schema.householdMemberships.userId,
        role: schema.householdMemberships.role,
        enabled: schema.householdMemberships.enabled,
        permissions: schema.householdMemberships.permissions,
        userName: schema.users.name,
        userEmail: schema.users.email,
        joinedAt: schema.householdMemberships.joinedAt,
      })
      .from(schema.householdMemberships)
      .innerJoin(schema.users, eq(schema.users.id, schema.householdMemberships.userId))
      .where(eq(schema.householdMemberships.householdId, householdId));

    return rows.map(MemberMapper.toDomain);
  }

  async findByMemberId(memberId: string, householdId: string): Promise<MemberEntity | null> {
    const [row] = await this.db
      .select({
        memberId: schema.householdMemberships.id,
        householdId: schema.householdMemberships.householdId,
        userId: schema.householdMemberships.userId,
        role: schema.householdMemberships.role,
        enabled: schema.householdMemberships.enabled,
        permissions: schema.householdMemberships.permissions,
        userName: schema.users.name,
        userEmail: schema.users.email,
        joinedAt: schema.householdMemberships.joinedAt,
      })
      .from(schema.householdMemberships)
      .innerJoin(schema.users, eq(schema.users.id, schema.householdMemberships.userId))
      .where(
        and(
          eq(schema.householdMemberships.id, memberId),
          eq(schema.householdMemberships.householdId, householdId),
        ),
      )
      .limit(1);

    return row ? MemberMapper.toDomain(row) : null;
  }

  async findByAuthId(
    householdId: string,
    authId: string,
  ): Promise<MemberEntity | null> {
    // Memoizado por request: a mesma associação é resolvida várias vezes no
    // mesmo handler (resolveActor/resolveMembership + overview direto).
    return requestMemo(`member:byAuthId:${householdId}:${authId}`, async () => {
      const [row] = await this.db
        .select({
          memberId: schema.householdMemberships.id,
          householdId: schema.householdMemberships.householdId,
          userId: schema.householdMemberships.userId,
          role: schema.householdMemberships.role,
          enabled: schema.householdMemberships.enabled,
          permissions: schema.householdMemberships.permissions,
          userName: schema.users.name,
          userEmail: schema.users.email,
          joinedAt: schema.householdMemberships.joinedAt,
        })
        .from(schema.householdMemberships)
        .innerJoin(
          schema.users,
          eq(schema.users.id, schema.householdMemberships.userId),
        )
        .where(
          and(
            eq(schema.householdMemberships.householdId, householdId),
            eq(schema.users.authId, authId),
          ),
        )
        .limit(1);

      if (row) return MemberMapper.toDomain(row);

      // Miss: super_admin age como owner de qualquer household. Sintetiza um membro
      // owner (memberId vazio — não há linha real) para que os fluxos que
      // resolvem o ator (caixa, serviços, overview) o tratem como dono.
      if (await isSuperAdmin(this.admin, authId)) {
        const [u] = await this.admin
          .select({
            id: schema.users.id,
            name: schema.users.name,
            email: schema.users.email,
          })
          .from(schema.users)
          .where(eq(schema.users.authId, authId))
          .limit(1);
        if (!u) return null;
        return MemberMapper.toDomain({
          memberId: "",
          householdId,
          userId: u.id,
          role: "owner",
          enabled: true,
          permissions: [],
          userName: u.name,
          userEmail: u.email,
          joinedAt: new Date(0),
        });
      }
      return null;
    });
  }

  async updateRole(memberId: string, role: HouseholdRole): Promise<MemberEntity> {
    await this.db
      .update(schema.householdMemberships)
      .set({ role })
      .where(eq(schema.householdMemberships.id, memberId));

    const [row] = await this.db
      .select({
        memberId: schema.householdMemberships.id,
        householdId: schema.householdMemberships.householdId,
        userId: schema.householdMemberships.userId,
        role: schema.householdMemberships.role,
        enabled: schema.householdMemberships.enabled,
        permissions: schema.householdMemberships.permissions,
        userName: schema.users.name,
        userEmail: schema.users.email,
        joinedAt: schema.householdMemberships.joinedAt,
      })
      .from(schema.householdMemberships)
      .innerJoin(schema.users, eq(schema.users.id, schema.householdMemberships.userId))
      .where(eq(schema.householdMemberships.id, memberId))
      .limit(1);

    if (!row) throw new Error("Member not found after update");
    return MemberMapper.toDomain(row);
  }

  async setEnabled(memberId: string, enabled: boolean): Promise<MemberEntity> {
    await this.db
      .update(schema.householdMemberships)
      .set({ enabled })
      .where(eq(schema.householdMemberships.id, memberId));

    const [row] = await this.db
      .select({
        memberId: schema.householdMemberships.id,
        householdId: schema.householdMemberships.householdId,
        userId: schema.householdMemberships.userId,
        role: schema.householdMemberships.role,
        enabled: schema.householdMemberships.enabled,
        permissions: schema.householdMemberships.permissions,
        userName: schema.users.name,
        userEmail: schema.users.email,
        joinedAt: schema.householdMemberships.joinedAt,
      })
      .from(schema.householdMemberships)
      .innerJoin(schema.users, eq(schema.users.id, schema.householdMemberships.userId))
      .where(eq(schema.householdMemberships.id, memberId))
      .limit(1);

    if (!row) throw new Error("Member not found after update");
    return MemberMapper.toDomain(row);
  }

  /** Conta owners ativos da household (para impedir desativar/remover o último). */
  async countActiveOwners(householdId: string): Promise<number> {
    const rows = await this.db
      .select({ id: schema.householdMemberships.id })
      .from(schema.householdMemberships)
      .where(
        and(
          eq(schema.householdMemberships.householdId, householdId),
          eq(schema.householdMemberships.role, "owner"),
          eq(schema.householdMemberships.enabled, true),
        ),
      );
    return rows.length;
  }

  /** Households em que o usuário é proprietário (qualquer status). */
  async countOwnedHouseholds(userId: string): Promise<number> {
    const rows = await this.admin
      .select({ id: schema.householdMemberships.id })
      .from(schema.householdMemberships)
      .where(
        and(
          eq(schema.householdMemberships.userId, userId),
          eq(schema.householdMemberships.role, "owner"),
        ),
      );
    return rows.length;
  }

  async removeAllByUserId(userId: string): Promise<void> {
    await this.admin
      .delete(schema.householdMemberships)
      .where(eq(schema.householdMemberships.userId, userId));
  }

  async transferOwnership(
    householdId: string,
    newOwnerMemberId: string,
    currentOwnerMemberId: string,
    demotedPermissions: string[],
  ): Promise<void> {
    await this.db.transaction(async (tx) => {
      // Antigo dono → funcionário (mantém acesso via permissions).
      await tx
        .update(schema.householdMemberships)
        .set({ role: "member", permissions: demotedPermissions })
        .where(
          and(
            eq(schema.householdMemberships.id, currentOwnerMemberId),
            eq(schema.householdMemberships.householdId, householdId),
          ),
        );
      // Novo dono → owner (garante ativo).
      await tx
        .update(schema.householdMemberships)
        .set({ role: "owner", enabled: true })
        .where(
          and(
            eq(schema.householdMemberships.id, newOwnerMemberId),
            eq(schema.householdMemberships.householdId, householdId),
          ),
        );
    });
  }

  async remove(memberId: string): Promise<void> {
    await this.db
      .delete(schema.householdMemberships)
      .where(eq(schema.householdMemberships.id, memberId));
  }
}
