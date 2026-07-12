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

    const source: EntitlementSource = subscription.compReason
      ? "comp"
      : subscription.stripeSubscriptionId
        ? "stripe"
        : subscription.type === "trial"
          ? "trial"
          : "free";

    return {
      plan,
      status: subscription.status,
      source,
      capabilities: capabilitiesFor(plan),
    };
  }
}
