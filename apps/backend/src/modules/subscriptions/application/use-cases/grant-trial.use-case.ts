import { Inject, Injectable } from "@nestjs/common";
import {
  SUBSCRIPTION_REPOSITORY,
  type ISubscriptionRepository,
} from "../../domain/subscription.repository.interface";
import { AuditService } from "../../../audit/audit.service";
import { TrialNotAllowedException } from "../../domain/exceptions/trial-not-allowed.exception";

/**
 * Concede trial administrativo por N meses (cenário 8 do hardening). 100%
 * local (sem Stripe, sem cartão — mesmo espírito do comp, ADR-0026 §2): o lar
 * ganha capabilities premium até `trial_ends_at`; o billing-expiry-sweep
 * devolve a free na expiração. Só concedível a um lar Free — comp/standard já
 * têm acesso (e um trial sobre uma sub Stripe ativa não faz sentido).
 */
@Injectable()
export class GrantTrialUseCase {
  constructor(
    @Inject(SUBSCRIPTION_REPOSITORY)
    private readonly repo: ISubscriptionRepository,
    private readonly audit: AuditService,
  ) {}

  async execute(
    householdId: string,
    months: number,
    actorAuthId: string,
  ): Promise<void> {
    const sub = await this.repo.getOrCreate(householdId);
    if (sub.type !== "free") {
      throw new TrialNotAllowedException("grant", sub.type);
    }

    const endsAt = new Date();
    endsAt.setMonth(endsAt.getMonth() + months);
    await this.repo.grantTrial(householdId, endsAt);

    await this.audit.logByAuthId(actorAuthId, {
      householdId,
      action: "subscription_changed",
      entityType: "subscription",
      entityId: sub.id,
      metadata: { operation: "grant_trial", months },
    });
  }
}
