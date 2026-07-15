import { Inject, Injectable } from "@nestjs/common";
import {
  SUBSCRIPTION_REPOSITORY,
  type ISubscriptionRepository,
} from "../../domain/subscription.repository.interface";
import {
  PAYMENT_GATEWAY,
  type IPaymentGateway,
} from "../../domain/ports/payment-gateway.port";
import {
  USER_REPOSITORY,
  type IUserRepository,
} from "../../../user/domain/user.repository.interface";
import { AuditService } from "../../../audit/audit.service";

export interface GrantCompCommand {
  reason: string;
  expiresAt: Date | null;
}

/**
 * Concede isenção (comp) a um lar — 100% local (ADR-0026 §2, B-7). Se houver
 * uma assinatura Stripe ativa, ela é cancelada via API antes (nunca cobrar em
 * paralelo a um comp); o `stripeCustomerId` é preservado pelo repo.
 */
@Injectable()
export class GrantCompUseCase {
  constructor(
    @Inject(SUBSCRIPTION_REPOSITORY)
    private readonly repo: ISubscriptionRepository,
    @Inject(PAYMENT_GATEWAY)
    private readonly gateway: IPaymentGateway,
    @Inject(USER_REPOSITORY)
    private readonly userRepo: IUserRepository,
    private readonly audit: AuditService,
  ) {}

  async execute(
    householdId: string,
    command: GrantCompCommand,
    actorAuthId: string,
  ): Promise<void> {
    const sub = await this.repo.getOrCreate(householdId);

    if (sub.stripeSubscriptionId) {
      await this.gateway.cancelSubscription(sub.stripeSubscriptionId);
    }

    const actor = await this.userRepo.findByAuthId(actorAuthId);
    await this.repo.grantComp(householdId, {
      reason: command.reason,
      grantedByUserId: actor?.id ?? null,
      expiresAt: command.expiresAt,
    });

    await this.audit.logByAuthId(actorAuthId, {
      householdId,
      action: "subscription_changed",
      entityType: "subscription",
      entityId: sub.id,
      metadata: { operation: "grant_comp", reason: command.reason },
    });
  }
}
