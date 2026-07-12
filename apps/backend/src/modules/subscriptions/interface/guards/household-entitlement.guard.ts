import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Request } from "express";
import { EntitlementsService } from "../../application/entitlements.service";
import type { Capability } from "../../domain/entitlements";
import { PremiumRequiredException } from "../../domain/exceptions/premium-required.exception";
import { REQUIRE_CAPABILITY_KEY } from "../decorators/require-capability.decorator";

/**
 * Gate por entitlement (ADR-0026 §7). Espelha o `HouseholdModuleGuard`: lê a
 * capability exigida via `@RequireCapability(...)`; se ausente, não checa nada
 * (a membership já garantiu acesso). Deve rodar **após** {@link AuthGuard} e
 * {@link HouseholdMembershipGuard} — depende do `householdId` na rota.
 */
@Injectable()
export class HouseholdEntitlementGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly entitlements: EntitlementsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<Capability | undefined>(
      REQUIRE_CAPABILITY_KEY,
      [context.getHandler(), context.getClass()],
    );
    // Sem capability exigida → nada a checar (membership já garante acesso).
    if (!required) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const householdId = request.params?.householdId;
    if (typeof householdId !== "string" || !householdId) {
      throw new ForbiddenException("Missing household context");
    }

    const ent = await this.entitlements.resolve(householdId);
    if (!ent.capabilities[required]) {
      throw new PremiumRequiredException(required, ent.plan);
    }
    return true;
  }
}
