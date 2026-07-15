import { Inject, Injectable, Logger } from "@nestjs/common";
import {
  SUBSCRIPTION_REPOSITORY,
  type ISubscriptionRepository,
} from "../../domain/subscription.repository.interface";
import { AuditService } from "../../../audit/audit.service";

export interface ExpireSubscriptionsResult {
  scanned: number;
  compExpired: number;
}

/**
 * Sweep de expiração local (billing-expiry-sweep): aplica `comp_expires_at`
 * (que era write-only desde o B-7 — bug latente). Só cobre isenção (comp),
 * 100% local — expiração de assinatura Stripe é do próprio Stripe (webhook/
 * reconciliação espelham); trial local (H-3) foi removido no M16 PR4, trial
 * hoje é self-serve via Stripe e nunca expira por sweep. Downgrade → `free`;
 * nunca apaga dados do lar (ADR-0026 §2).
 */
@Injectable()
export class ExpireSubscriptionsUseCase {
  private readonly logger = new Logger(ExpireSubscriptionsUseCase.name);

  constructor(
    @Inject(SUBSCRIPTION_REPOSITORY)
    private readonly repo: ISubscriptionRepository,
    private readonly audit: AuditService,
  ) {}

  async execute(now = new Date()): Promise<ExpireSubscriptionsResult> {
    const expired = await this.repo.findExpired(now);

    for (const { householdId } of expired) {
      await this.repo.revokeComp(householdId);
      // Ação do sistema (cron) — sem ator.
      await this.audit.log({
        actorId: null,
        householdId,
        action: "subscription_changed",
        entityType: "subscription",
        entityId: householdId,
        metadata: { operation: "comp_expired" },
      });
    }

    if (expired.length > 0) {
      this.logger.log(`Expiry sweep: comp=${expired.length} downgraded para free.`);
    }
    return { scanned: expired.length, compExpired: expired.length };
  }
}
