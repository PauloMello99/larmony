import { Inject, Injectable } from "@nestjs/common";
import {
  SUBSCRIPTION_REPOSITORY,
  type ISubscriptionRepository,
} from "../domain/subscription.repository.interface";
import type { SubscriptionStatus } from "../domain/subscription.entity";

export type ResolvedPlan = "free" | "premium" | "custom";
export type EntitlementSource = "stripe" | "comp" | "free";

export interface ResolvedEntitlements {
  plan: ResolvedPlan;
  status: SubscriptionStatus;
  source: EntitlementSource;
  /** Lista de capabilities do plano Free fica em aberto (decisão de produto
   *  D-1, ver ADR-0026 §7) — este serviço define o mecanismo, não a lista. */
  capabilities: Record<string, boolean>;
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
        : "free";

    return {
      plan,
      status: subscription.status,
      source,
      capabilities: {},
    };
  }
}
