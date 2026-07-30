import { Inject, Injectable } from "@nestjs/common";
import { eq, sql } from "drizzle-orm";
import {
  DRIZZLE,
  DRIZZLE_ADMIN,
  DrizzleDB,
} from "../../../../database/database.module";
import * as schema from "../../../../database/schema";
import { EmailAlreadyRegisteredException } from "../../../auth/domain/exceptions/email-already-registered.exception";
import {
  CreateUserData,
  UpdateUserData,
  UserEntity,
} from "../../domain/user.entity";
import {
  AuthIdentityProvider,
  IUserRepository,
} from "../../domain/user.repository.interface";
import { UserMapper } from "./user.mapper";

@Injectable()
export class DrizzleUserRepository implements IUserRepository {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    // create() runs during sign-up (no auth context yet), so it bypasses RLS.
    @Inject(DRIZZLE_ADMIN) private readonly admin: DrizzleDB,
  ) {}

  /**
   * Resolve o users.id a partir de um auth_id de qualquer identidade
   * vinculada (senha, Google, Apple) — nunca users.auth_id direto, que só
   * cobre a identidade original (ADR-0032 adendo, múltiplas identidades).
   */
  private async resolveUserIdByAuthId(
    authId: string,
    conn: DrizzleDB = this.db,
  ): Promise<string | null> {
    const [row] = await conn
      .select({ userId: schema.userIdentities.userId })
      .from(schema.userIdentities)
      .where(eq(schema.userIdentities.authId, authId))
      .limit(1);
    return row?.userId ?? null;
  }

  async findByAuthId(authId: string): Promise<UserEntity | null> {
    const userId = await this.resolveUserIdByAuthId(authId);
    if (!userId) return null;
    return this.findById(userId);
  }

  async findById(id: string): Promise<UserEntity | null> {
    const [row] = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, id))
      .limit(1);
    return row ? UserMapper.toDomain(row) : null;
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    // Roda no lookup do convite (sem contexto de auth) → conexão admin.
    const [row] = await this.admin
      .select()
      .from(schema.users)
      .where(sql`lower(${schema.users.email}) = lower(${email})`)
      .limit(1);
    return row ? UserMapper.toDomain(row) : null;
  }

  async create(data: CreateUserData): Promise<UserEntity> {
    return this.admin.transaction(async (tx) => {
      const [row] = await tx
        .insert(schema.users)
        .values({
          authId: data.authId,
          name: data.name,
          email: data.email,
          // Aceite dos Termos/Privacidade (LGPD): timestamp só se houver versão
          // (login social provisiona com termsVersion null — aceite pendente).
          termsAcceptedAt: data.termsVersion ? new Date() : null,
          termsVersion: data.termsVersion,
          // Locale da UI no cadastro; ausente → default do schema (pt-BR).
          ...(data.locale !== undefined && { locale: data.locale }),
        })
        .onConflictDoNothing()
        .returning();

      if (row) {
        await tx
          .insert(schema.userIdentities)
          .values({ userId: row.id, provider: data.provider, authId: data.authId })
          .onConflictDoNothing();
        return UserMapper.toDomain(row);
      }

      // onConflictDoNothing sem retorno: colisão por auth_id (mesmo usuário,
      // tentativa concorrente) ou por email (auth_id diferente já cadastrado).
      // Re-leitura via tx (não this.findByAuthId): create() roda sem
      // contexto de auth, então this.db (RLS) não enxergaria a linha.
      const [existing] = await tx
        .select()
        .from(schema.users)
        .where(eq(schema.users.authId, data.authId))
        .limit(1);
      if (existing) return UserMapper.toDomain(existing);

      throw new EmailAlreadyRegisteredException();
    });
  }

  async linkIdentity(
    userId: string,
    provider: AuthIdentityProvider,
    authId: string,
  ): Promise<void> {
    await this.admin
      .insert(schema.userIdentities)
      .values({ userId, provider, authId })
      .onConflictDoNothing();
  }

  async delete(authId: string): Promise<void> {
    // Exclusão de conta roda fora de contexto multi-tenant → conexão admin.
    const userId = await this.resolveUserIdByAuthId(authId, this.admin);
    if (!userId) return;
    await this.admin.delete(schema.users).where(eq(schema.users.id, userId));
  }

  async update(authId: string, data: UpdateUserData): Promise<UserEntity> {
    const userId = await this.resolveUserIdByAuthId(authId);
    if (!userId) throw new Error("User not found for authId");
    const [row] = await this.db
      .update(schema.users)
      .set({
        ...(data.name !== undefined && { name: data.name }),
        ...(data.email !== undefined && { email: data.email }),
        ...(data.avatarUrl !== undefined && { avatarUrl: data.avatarUrl }),
        ...(data.locale !== undefined && { locale: data.locale }),
        updatedAt: new Date(),
      })
      .where(eq(schema.users.id, userId))
      .returning();
    return UserMapper.toDomain(row!);
  }

  async mergeOnboarding(
    authId: string,
    patch: Record<string, number>,
  ): Promise<UserEntity> {
    const userId = await this.resolveUserIdByAuthId(authId);
    if (!userId) throw new Error("User not found for authId");
    const [row] = await this.db
      .update(schema.users)
      .set({
        // Merge atômico via operador jsonb `||` (patch sobrescreve as chaves iguais).
        onboarding: sql`${schema.users.onboarding} || ${JSON.stringify(patch)}::jsonb`,
        updatedAt: new Date(),
      })
      .where(eq(schema.users.id, userId))
      .returning();
    return UserMapper.toDomain(row!);
  }

  async acceptTerms(authId: string, version: string): Promise<UserEntity> {
    const userId = await this.resolveUserIdByAuthId(authId);
    if (!userId) throw new Error("User not found for authId");
    const [row] = await this.db
      .update(schema.users)
      .set({
        termsAcceptedAt: new Date(),
        termsVersion: version,
        updatedAt: new Date(),
      })
      .where(eq(schema.users.id, userId))
      .returning();
    return UserMapper.toDomain(row!);
  }

  async listIdentityAuthIds(userId: string): Promise<string[]> {
    const rows = await this.admin
      .select({ authId: schema.userIdentities.authId })
      .from(schema.userIdentities)
      .where(eq(schema.userIdentities.userId, userId));
    return rows.map((r) => r.authId);
  }
}
