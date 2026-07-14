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
/** Origem do acesso (dimensão de rótulo/UI, separada do plano resolvido). */
export type EntitlementSource = "stripe" | "comp" | "trial" | "locked";

export interface ResolvedEntitlements {
  plan: ResolvedPlan;
  status: SubscriptionStatus;
  source: EntitlementSource;
  /** Mapa capability → habilitada para o plano resolvido (M16). */
  capabilities: Record<Capability, boolean>;
}

/**
 * Ponto único de gating server-side (M16). Exportado pelo módulo no mesmo
 * padrão de bridge cross-módulo do `DispatchNotificationUseCase` (ADR-0023) —
 * outros módulos injetam esta classe diretamente, sem token.
 *
 * Resolução (ver plano M16):
 * - `type=custom` (comp) ⇒ `completo` (isenção admin nunca é rebaixada).
 * - `type=standard` + `status=trialing` ⇒ `completo` (trial self-serve via
 *   Stripe dá acesso Completo, independente do plano escolhido no checkout).
 * - `type=standard` + `status=active|past_due` ⇒ `tier` do preço (fallback
 *   `completo` se, por algum motivo legado, o tier não estiver setado — nunca
 *   restringe um pagante a menos do que contratou).
 * - resto (`free`, `standard/canceled`, ou `trial` legado do admin local
 *   removido no PR4) ⇒ `locked` (somente-leitura).
 */
@Injectable()
export class EntitlementsService {
  constructor(
    @Inject(SUBSCRIPTION_REPOSITORY)
    private readonly repo: ISubscriptionRepository,
  ) {}

  async resolve(householdId: string): Promise<ResolvedEntitlements> {
    const sub = await this.repo.getOrCreate(householdId);

    let plan: ResolvedPlan;
    let source: EntitlementSource;

    if (sub.type === "custom") {
      plan = "completo";
      source = "comp";
    } else if (
      sub.type === "standard" &&
      (sub.status === "active" || sub.status === "trialing" || sub.status === "past_due")
    ) {
      if (sub.status === "trialing") {
        plan = "completo";
        source = "trial";
      } else {
        plan = sub.tier ?? "completo";
        source = "stripe";
      }
    } else {
      // free, ou standard/canceled → sem assinatura ativa.
      plan = "locked";
      source = "locked";
    }

    return {
      plan,
      status: sub.status,
      source,
      capabilities: capabilitiesFor(plan),
    };
  }
}
