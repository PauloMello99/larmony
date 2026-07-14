import { ExecutionContext } from "@nestjs/common";
import { ActiveSubscriptionGuard } from "./active-subscription.guard";
import type { EntitlementsService, ResolvedEntitlements } from "../../application/entitlements.service";
import { SubscriptionRequiredException } from "../../domain/exceptions/subscription-required.exception";

function ctx(method: string, householdId: string | undefined): ExecutionContext {
  const req = { method, params: householdId ? { householdId } : {} };
  return {
    switchToHttp: () => ({ getRequest: () => req }),
  } as unknown as ExecutionContext;
}

function make(plan: ResolvedEntitlements["plan"]) {
  const entitlements = {
    resolve: jest.fn().mockResolvedValue({ plan } as ResolvedEntitlements),
  } as unknown as jest.Mocked<EntitlementsService>;
  const guard = new ActiveSubscriptionGuard(entitlements);
  return { guard, entitlements };
}

describe("ActiveSubscriptionGuard (M16)", () => {
  it("GET sempre libera, sem consultar entitlements (leitura é livre)", async () => {
    const { guard, entitlements } = make("locked");
    await expect(guard.canActivate(ctx("GET", "hh_1"))).resolves.toBe(true);
    expect(entitlements.resolve).not.toHaveBeenCalled();
  });

  it("escrita sem householdId no param → libera (ex.: criar 1º lar)", async () => {
    const { guard, entitlements } = make("locked");
    await expect(guard.canActivate(ctx("POST", undefined))).resolves.toBe(true);
    expect(entitlements.resolve).not.toHaveBeenCalled();
  });

  it("escrita em lar locked → 402 SubscriptionRequiredException", async () => {
    const { guard } = make("locked");
    await expect(guard.canActivate(ctx("POST", "hh_1"))).rejects.toBeInstanceOf(
      SubscriptionRequiredException,
    );
  });

  it("escrita em lar essencial → libera", async () => {
    const { guard } = make("essencial");
    await expect(guard.canActivate(ctx("POST", "hh_1"))).resolves.toBe(true);
  });

  it("escrita em lar completo → libera", async () => {
    const { guard } = make("completo");
    await expect(guard.canActivate(ctx("DELETE", "hh_1"))).resolves.toBe(true);
  });
});
