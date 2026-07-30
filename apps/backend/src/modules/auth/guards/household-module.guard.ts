import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Request } from "express";
import { and, eq } from "drizzle-orm";
import { DRIZZLE_ADMIN, type DrizzleDB } from "../../../database/database.module";
import * as schema from "../../../database/schema";
import { isSuperAdmin } from "../../../common/auth/is-super-admin";
import { AuthUser } from "../application/ports/auth-provider.interface";
import {
  hasModuleAccess,
  type ModuleKey,
} from "../../households/domain/member-permissions";
import { REQUIRE_MODULE_KEY } from "../decorators/require-module.decorator";

/**
 * Autoriza acesso a um **módulo** da household: owner sempre passa; funcionário precisa
 * do módulo nas suas permissões (PERM-1). O módulo vem do `@RequireModule(...)`.
 * Usar após {@link AuthGuard} e {@link HouseholdMembershipGuard}.
 */
@Injectable()
export class HouseholdModuleGuard implements CanActivate {
  constructor(
    @Inject(DRIZZLE_ADMIN) private readonly db: DrizzleDB,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<ModuleKey | undefined>(
      REQUIRE_MODULE_KEY,
      [context.getHandler(), context.getClass()],
    );
    // Sem módulo exigido → nada a checar aqui (membership já garante acesso).
    if (!required) return true;

    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: AuthUser }>();
    const user = request.user;
    const householdId = request.params?.householdId;
    if (!user) throw new ForbiddenException("Not authenticated");
    if (typeof householdId !== "string" || !householdId) {
      throw new ForbiddenException("Missing household context");
    }

    const [row] = await this.db
      .select({
        role: schema.householdMemberships.role,
        permissions: schema.householdMemberships.permissions,
      })
      .from(schema.householdMemberships)
      .innerJoin(schema.users, eq(schema.users.id, schema.householdMemberships.userId))
      .innerJoin(
        schema.userIdentities,
        eq(schema.userIdentities.userId, schema.users.id),
      )
      .where(
        and(
          eq(schema.householdMemberships.householdId, householdId),
          eq(schema.userIdentities.authId, user.id),
          eq(schema.householdMemberships.enabled, true),
        ),
      )
      .limit(1);

    if (!row) {
      // super_admin age como owner (acesso a todos os módulos).
      if (await isSuperAdmin(this.db, user.id)) return true;
      throw new ForbiddenException("You do not have access to this household");
    }

    const role = row.role as "owner" | "member";
    if (!hasModuleAccess(role, row.permissions ?? [], required)) {
      throw new ForbiddenException(
        "You do not have permission to access this module",
      );
    }
    return true;
  }
}
