import { ExecutionContext, ForbiddenException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { HouseholdEntitlementGuard } from "./household-entitlement.guard";
import type { EntitlementsService } from "../../application/entitlements.service";
import { PremiumRequiredException } from "../../domain/exceptions/premium-required.exception";

function contextWith(householdId: string | undefined): ExecutionContext {
  const req = { params: householdId ? { householdId } : {} };
  return {
    switchToHttp: () => ({ getRequest: () => req }),
    getHandler: () => () => undefined,
    getClass: () => class {},
  } as unknown as ExecutionContext;
}

function make(requiredCapability: string | undefined) {
  const reflector = {
    getAllAndOverride: jest.fn().mockReturnValue(requiredCapability),
  } as unknown as Reflector;
  const entitlements = {
    resolve: jest.fn(),
  } as unknown as jest.Mocked<EntitlementsService>;
  const guard = new HouseholdEntitlementGuard(reflector, entitlements);
  return { guard, entitlements };
}

describe("HouseholdEntitlementGuard", () => {
  it("sem @RequireCapability → libera sem consultar entitlements", async () => {
    const { guard, entitlements } = make(undefined);

    await expect(guard.canActivate(contextWith("hh_1"))).resolves.toBe(true);
    expect(entitlements.resolve).not.toHaveBeenCalled();
  });

  it("capability habilitada → libera", async () => {
    const { guard, entitlements } = make("advanced_reports");
    entitlements.resolve.mockResolvedValue({
      plan: "premium",
      status: "active",
      source: "stripe",
      capabilities: { advanced_reports: true, report_export: true, custom_categories: true },
      limits: {
        maxHouseholdsOwned: Infinity,
        maxMembersPerHousehold: Infinity,
        maxActiveGoals: Infinity,
        maxActiveBudgets: Infinity,
      },
    });

    await expect(guard.canActivate(contextWith("hh_1"))).resolves.toBe(true);
    expect(entitlements.resolve).toHaveBeenCalledWith("hh_1");
  });

  it("capability negada → lança PremiumRequiredException", async () => {
    const { guard, entitlements } = make("advanced_reports");
    entitlements.resolve.mockResolvedValue({
      plan: "free",
      status: "active",
      source: "free",
      capabilities: { advanced_reports: false, report_export: false, custom_categories: false },
      limits: {
        maxHouseholdsOwned: 1,
        maxMembersPerHousehold: 2,
        maxActiveGoals: 3,
        maxActiveBudgets: 3,
      },
    });

    await expect(guard.canActivate(contextWith("hh_1"))).rejects.toBeInstanceOf(
      PremiumRequiredException,
    );
  });

  it("capability exigida mas householdId ausente → ForbiddenException", async () => {
    const { guard } = make("advanced_reports");

    await expect(guard.canActivate(contextWith(undefined))).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
});
