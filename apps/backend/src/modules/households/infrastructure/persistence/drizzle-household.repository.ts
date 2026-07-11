import { Inject, Injectable } from "@nestjs/common";
import { asc, eq, and, type SQL } from "drizzle-orm";
import {
  DRIZZLE,
  DRIZZLE_ADMIN,
  type DrizzleDB,
} from "../../../../database/database.module";
import * as schema from "../../../../database/schema";
import { isSuperAdmin } from "../../../../common/auth/is-super-admin";
import type { IHouseholdRepository } from "../../domain/household.repository.interface";
import type { HouseholdEntity } from "../../domain/household.entity";
import { HouseholdMapper } from "./household.mapper";

const ORG_SELECT = {
  id: schema.households.id,
  name: schema.households.name,
  slug: schema.households.slug,
  logoUrl: schema.households.logoUrl,
  role: schema.householdMemberships.role,
  permissions: schema.householdMemberships.permissions,
  timezone: schema.households.timezone,
  notificationHour: schema.households.notificationHour,
  createdAt: schema.households.createdAt,
  updatedAt: schema.households.updatedAt,
} as const;

@Injectable()
export class DrizzleHouseholdRepository implements IHouseholdRepository {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    // create() inserts the first owner membership before one exists, which the
    // household_memberships_insert RLS policy would block — so it bypasses RLS.
    @Inject(DRIZZLE_ADMIN) private readonly admin: DrizzleDB,
  ) {}

  async findAllByAuthId(authId: string): Promise<HouseholdEntity[]> {
    const rows = await this.db
      .select(ORG_SELECT)
      .from(schema.households)
      .innerJoin(
        schema.householdMemberships,
        eq(schema.householdMemberships.householdId, schema.households.id),
      )
      .innerJoin(schema.users, eq(schema.users.id, schema.householdMemberships.userId))
      .where(eq(schema.users.authId, authId))
      .orderBy(asc(schema.households.name));

    return rows.map(HouseholdMapper.toDomain);
  }

  async findByIdAndAuthId(householdId: string, authId: string): Promise<HouseholdEntity | null> {
    const [row] = await this.db
      .select(ORG_SELECT)
      .from(schema.households)
      .innerJoin(
        schema.householdMemberships,
        eq(schema.householdMemberships.householdId, schema.households.id),
      )
      .innerJoin(schema.users, eq(schema.users.id, schema.householdMemberships.userId))
      .where(and(eq(schema.households.id, householdId), eq(schema.users.authId, authId)))
      .limit(1);

    if (row) return HouseholdMapper.toDomain(row);
    // Miss: super_admin age como owner de qualquer household.
    if (await isSuperAdmin(this.admin, authId)) {
      return this.findByIdAsOwner(eq(schema.households.id, householdId));
    }
    return null;
  }

  async findBySlugAndAuthId(slug: string, authId: string): Promise<HouseholdEntity | null> {
    const [row] = await this.db
      .select(ORG_SELECT)
      .from(schema.households)
      .innerJoin(
        schema.householdMemberships,
        eq(schema.householdMemberships.householdId, schema.households.id),
      )
      .innerJoin(schema.users, eq(schema.users.id, schema.householdMemberships.userId))
      .where(and(eq(schema.households.slug, slug), eq(schema.users.authId, authId)))
      .limit(1);

    if (row) return HouseholdMapper.toDomain(row);
    if (await isSuperAdmin(this.admin, authId)) {
      return this.findByIdAsOwner(eq(schema.households.slug, slug));
    }
    return null;
  }

  /** Busca a household (sem membership) e sintetiza role "owner" — caminho super_admin. */
  private async findByIdAsOwner(where: SQL): Promise<HouseholdEntity | null> {
    const [household] = await this.admin
      .select({
        id: schema.households.id,
        name: schema.households.name,
        slug: schema.households.slug,
        logoUrl: schema.households.logoUrl,
        timezone: schema.households.timezone,
        notificationHour: schema.households.notificationHour,
        createdAt: schema.households.createdAt,
        updatedAt: schema.households.updatedAt,
      })
      .from(schema.households)
      .where(where)
      .limit(1);

    if (!household) return null;
    return HouseholdMapper.toDomain({ ...household, role: "owner", permissions: [] });
  }

  async isOwner(householdId: string, authId: string): Promise<boolean> {
    const [row] = await this.db
      .select({ role: schema.householdMemberships.role })
      .from(schema.householdMemberships)
      .innerJoin(schema.users, eq(schema.users.id, schema.householdMemberships.userId))
      .where(
        and(
          eq(schema.householdMemberships.householdId, householdId),
          eq(schema.users.authId, authId),
          eq(schema.householdMemberships.role, "owner"),
        ),
      )
      .limit(1);

    if (row) return true;
    // super_admin pode agir como owner.
    return isSuperAdmin(this.admin, authId);
  }

  async create(name: string, slug: string, creatorAuthId: string): Promise<HouseholdEntity> {
    return this.admin.transaction(async (tx) => {
      // Find the creator's user record
      const [user] = await tx
        .select({ id: schema.users.id })
        .from(schema.users)
        .where(eq(schema.users.authId, creatorAuthId))
        .limit(1);

      if (!user) throw new Error("User not found");

      // Create the household
      const insertedHouseholds = await tx
        .insert(schema.households)
        .values({ name, slug })
        .returning();
      const household = insertedHouseholds[0];
      if (!household) throw new Error("Failed to create household");

      // Add creator as owner
      await tx.insert(schema.householdMemberships).values({
        householdId: household.id,
        userId: user.id,
        role: "owner",
      });

      // Seed das 13 categorias padrão do lar (ver domain-rules — por use-case/
      // repositório, não por trigger; lista herdada do old-larmony).
      const defaultCategories: Array<{
        name: string;
        type: "income" | "expense";
        color: string;
        icon: string;
      }> = [
        { name: "Salário", type: "income", color: "#22c55e", icon: "Banknote" },
        { name: "Freelance", type: "income", color: "#16a34a", icon: "Briefcase" },
        { name: "Investimentos", type: "income", color: "#15803d", icon: "TrendingUp" },
        { name: "Outros (entrada)", type: "income", color: "#4ade80", icon: "CirclePlus" },
        { name: "Alimentação", type: "expense", color: "#ef4444", icon: "UtensilsCrossed" },
        { name: "Moradia", type: "expense", color: "#dc2626", icon: "Home" },
        { name: "Transporte", type: "expense", color: "#f97316", icon: "Car" },
        { name: "Saúde", type: "expense", color: "#ec4899", icon: "Heart" },
        { name: "Educação", type: "expense", color: "#8b5cf6", icon: "BookOpen" },
        { name: "Lazer", type: "expense", color: "#06b6d4", icon: "Gamepad2" },
        { name: "Vestuário", type: "expense", color: "#f59e0b", icon: "Shirt" },
        { name: "Assinaturas", type: "expense", color: "#6366f1", icon: "RefreshCw" },
        { name: "Outros (saída)", type: "expense", color: "#64748b", icon: "CircleMinus" },
      ];
      await tx
        .insert(schema.categories)
        .values(
          defaultCategories.map((c) => ({
            householdId: household.id,
            isDefault: true,
            ...c,
          })),
        )
        .onConflictDoNothing();

      return HouseholdMapper.toDomain({ ...household, role: "owner" as const });
    });
  }

  async update(householdId: string, data: { name?: string }): Promise<HouseholdEntity> {
    await this.db
      .update(schema.households)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(schema.households.id, householdId));

    // Re-fetch with role (join through owner membership)
    const [row] = await this.db
      .select(ORG_SELECT)
      .from(schema.households)
      .innerJoin(
        schema.householdMemberships,
        eq(schema.householdMemberships.householdId, schema.households.id),
      )
      .innerJoin(schema.users, eq(schema.users.id, schema.householdMemberships.userId))
      .where(
        and(
          eq(schema.households.id, householdId),
          eq(schema.householdMemberships.role, "owner"),
        ),
      )
      .limit(1);

    if (!row) throw new Error("Household not found after update");
    return HouseholdMapper.toDomain(row);
  }

  async delete(householdId: string): Promise<void> {
    await this.db
      .delete(schema.households)
      .where(eq(schema.households.id, householdId));
  }
}
