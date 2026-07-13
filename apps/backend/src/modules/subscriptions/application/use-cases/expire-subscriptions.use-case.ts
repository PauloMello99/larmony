import { Inject, Injectable, Logger } from "@nestjs/common";
import {
  SUBSCRIPTION_REPOSITORY,
  type ISubscriptionRepository,
} from "../../domain/subscription.repository.interface";
import { AuditService } from "../../../audit/audit.service";

export interface ExpireSubscriptionsResult {
  scanned: number;
  compExpired: number;
  trialExpired: number;
}

/**
 * Sweep de expiração local (billing-expiry-sweep): aplica `comp_expires_at`
 * (que era write-only desde o B-7 — bug latente) e `trial_ends_at` (trial
 * administrativo, H-3). Só cobre assinaturas 100% locais — expiração de
 * assinatura Stripe é do próprio Stripe (webhook/reconciliação espelham).
 * Downgrade → `free`; nunca apaga dados do lar (ADR-0026 §2).
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
    let compExpired = 0;
    let trialExpired = 0;

    for (const { householdId, kind } of expired) {
      if (kind === "comp") {
        await this.repo.revokeComp(householdId);
        compExpired += 1;
      } else {
        await this.repo.expireTrial(householdId);
        trialExpired += 1;
      }
      // Ação do sistema (cron) — sem ator.
      await this.audit.log({
        actorId: null,
        householdId,
        action: "subscription_changed",
        entityType: "subscription",
        entityId: householdId,
        metadata: {
          operation: kind === "comp" ? "comp_expired" : "trial_expired",
        },
      });
    }

    if (expired.length > 0) {
      this.logger.log(
        `Expiry sweep: comp=${compExpired} trial=${trialExpired} downgraded para free.`,
      );
    }
    return { scanned: expired.length, compExpired, trialExpired };
  }
}
