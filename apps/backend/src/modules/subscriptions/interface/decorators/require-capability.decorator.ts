import { SetMetadata } from "@nestjs/common";
import type { Capability } from "../../domain/entitlements";

export const REQUIRE_CAPABILITY_KEY = "require_capability";

/**
 * Marca a capability exigida para acessar um controller/rota. Consumida pelo
 * {@link HouseholdEntitlementGuard} (mesmo padrão de `@RequireModule`): resolve
 * os entitlements do lar e bloqueia (402) se a capability não estiver ativa.
 * Ex.: `@RequireCapability("advanced_reports")`.
 */
export const RequireCapability = (capability: Capability) =>
  SetMetadata(REQUIRE_CAPABILITY_KEY, capability);
