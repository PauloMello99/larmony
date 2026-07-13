import { Inject, Injectable } from "@nestjs/common";
import {
  SUBSCRIPTION_REPOSITORY,
  type ISubscriptionRepository,
} from "../../domain/subscription.repository.interface";
import { AuditService } from "../../../audit/audit.service";

/**
 * Revoga a isenção de um lar → volta a `free`. Nenhum dado do lar é apagado
 * (downgrade nunca destrói — ADR-0026 §2). O lar precisa refazer checkout para
 * voltar a ser Premium.
 */
@Injectable()
export class RevokeCompUseCase {
  constructor(
    @Inject(SUBSCRIPTION_REPOSITORY)
    private readonly repo: ISubscriptionRepository,
    private readonly audit: AuditService,
  ) {}

  async execute(householdId: string, actorAuthId: string): Promise<void> {
    const sub = await this.repo.getOrCreate(householdId);
    await this.repo.revokeComp(householdId);

    await this.audit.logByAuthId(actorAuthId, {
      householdId,
      action: "subscription_changed",
      entityType: "subscription",
      entityId: sub.id,
      metadata: { operation: "revoke_comp" },
    });
  }
}
