import { Inject, Injectable } from "@nestjs/common";
import {
  SUBSCRIPTION_REPOSITORY,
  type ISubscriptionRepository,
} from "../../domain/subscription.repository.interface";
import { AuditService } from "../../../audit/audit.service";
import { TrialNotAllowedException } from "../../domain/exceptions/trial-not-allowed.exception";

/** Revoga um trial administrativo antes da expiração → lar volta a free. */
@Injectable()
export class RevokeTrialUseCase {
  constructor(
    @Inject(SUBSCRIPTION_REPOSITORY)
    private readonly repo: ISubscriptionRepository,
    private readonly audit: AuditService,
  ) {}

  async execute(householdId: string, actorAuthId: string): Promise<void> {
    const sub = await this.repo.getOrCreate(householdId);
    if (sub.type !== "trial") {
      throw new TrialNotAllowedException("revoke", sub.type);
    }

    await this.repo.expireTrial(householdId);

    await this.audit.logByAuthId(actorAuthId, {
      householdId,
      action: "subscription_changed",
      entityType: "subscription",
      entityId: sub.id,
      metadata: { operation: "revoke_trial" },
    });
  }
}
