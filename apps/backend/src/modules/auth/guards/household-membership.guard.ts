import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
} from "@nestjs/common";
import { Request } from "express";
import { and, eq } from "drizzle-orm";
import { DRIZZLE_ADMIN, type DrizzleDB } from "../../../database/database.module";
import * as schema from "../../../database/schema";
import { isSuperAdmin } from "../../../common/auth/is-super-admin";
import { AuthUser } from "../application/ports/auth-provider.interface";

/**
 * Authorizes that the authenticated user belongs to the `:householdId` in the route.
 *
 * Must run AFTER {@link AuthGuard} (which populates `request.user`):
 *   `@UseGuards(AuthGuard, HouseholdMembershipGuard)`
 *
 * Apply to every household-scoped resource controller (materials, customers, …) so a
 * valid token for one household cannot read/write another household's data. Returns 403 if
 * the user is not a member of the household.
 */
@Injectable()
export class HouseholdMembershipGuard implements CanActivate {
  // Guards run BEFORE the RlsInterceptor sets request claims, so this query
  // must use the privileged connection. It already enforces isolation itself
  // by filtering on the authenticated user's id.
  constructor(@Inject(DRIZZLE_ADMIN) private readonly db: DrizzleDB) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: AuthUser }>();
    const user = request.user;
    const householdId = request.params?.householdId;

    if (!user) {
      throw new ForbiddenException("Not authenticated");
    }
    if (typeof householdId !== "string" || !householdId) {
      throw new ForbiddenException("Missing household context");
    }

    const [membership] = await this.db
      .select({
        id: schema.householdMemberships.id,
        platformRole: schema.users.platformRole,
        suspendedAt: schema.households.suspendedAt,
      })
      .from(schema.householdMemberships)
      .innerJoin(
        schema.users,
        eq(schema.users.id, schema.householdMemberships.userId),
      )
      .innerJoin(
        schema.households,
        eq(schema.households.id, schema.householdMemberships.householdId),
      )
      .where(
        and(
          eq(schema.householdMemberships.householdId, householdId),
          eq(schema.users.authId, user.id),
          // Membro inativo perde acesso à household.
          eq(schema.householdMemberships.enabled, true),
        ),
      )
      .limit(1);

    if (!membership) {
      // super_admin age como owner em qualquer household (inclusive suspensa).
      if (await isSuperAdmin(this.db, user.id)) return true;
      throw new ForbiddenException(
        "You do not have access to this household",
      );
    }

    // Household suspensa pelo super_admin (PLAT-1): bloqueia todos menos super_admin.
    if (
      membership.suspendedAt !== null &&
      membership.platformRole !== "super_admin"
    ) {
      throw new ForbiddenException("This household is suspended");
    }

    return true;
  }
}
