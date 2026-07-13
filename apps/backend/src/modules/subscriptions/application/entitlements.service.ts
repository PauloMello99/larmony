import { Inject, Injectable } from "@nestjs/common";
import {
  SUBSCRIPTION_REPOSITORY,
  type ISubscriptionRepository,
} from "../domain/subscription.repository.interface";
import type { SubscriptionStatus } from "../domain/subscription.entity";
import {
  capabilitiesFor,
  type Capability,
  type ResolvedPlan,
} from "../domain/entitlements";

export type { ResolvedPlan } from "../domain/entitlements";
export type EntitlementSource = "stripe" | "comp" | "trial" | "free";

export interface ResolvedEntitlements {
  plan: ResolvedPlan;
  status: SubscriptionStatus;
  source: EntitlementSource;
  /** Mapa capability → habilitada para o plano resolvido. A régua comercial
   *  (que capabilities o Free perde) é decisão de produto (D-1); o mapa vive em
   *  `domain/entitlements.ts`. */
  capabilities: Record<Capability, boolean>;
}

/**
 * Ponto único de gating server-side (ADR-0026 §7). Exportado pelo módulo no
 * mesmo padrão de bridge cross-módulo do `DispatchNotificationUseCase`
 * (ADR-0023) — outros módulos injetam esta classe diretamente, sem token.
 */
@Injectable()
export class EntitlementsService {
  constructor(
    @Inject(SUBSCRIPTION_REPOSITORY)
    private readonly repo: ISubscriptionRepository,
  ) {}

  async resolve(householdId: string): Promise<ResolvedEntitlements> {
    const subscription = await this.repo.getOrCreate(householdId);

    const plan: ResolvedPlan =
      subscription.type === "free"
        ? "free"
        : subscription.type === "custom"
          ? "custom"
          : "premium";

    // Trial vem ANTES do check de stripeSubscriptionId: o id de uma sub
    // cancelada fica gravado para registro (B-3) e classificaria errado um
    // lar em trial como source=stripe (pego pela bateria do hardening).
    const source: EntitlementSource = subscription.compReason
      ? "comp"
      : subscription.type === "trial"
        ? "trial"
        : subscription.stripeSubscriptionId
          ? "stripe"
          : "free";

    return {
      plan,
      status: subscription.status,
      source,
      capabilities: capabilitiesFor(plan),
    };
  }
}
