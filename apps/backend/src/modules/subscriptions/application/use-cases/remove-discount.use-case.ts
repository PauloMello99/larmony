import { Inject, Injectable } from "@nestjs/common";
import {
  SUBSCRIPTION_REPOSITORY,
  type ISubscriptionRepository,
} from "../../domain/subscription.repository.interface";
import {
  PAYMENT_GATEWAY,
  type IPaymentGateway,
} from "../../domain/ports/payment-gateway.port";
import { AuditService } from "../../../audit/audit.service";
import { SubscriptionNotStripeLinkedException } from "../../domain/exceptions/subscription-not-stripe-linked.exception";

/** Remove o desconto (coupon) de um lar no Stripe e limpa o cache local (B-7). */
@Injectable()
export class RemoveDiscountUseCase {
  constructor(
    @Inject(SUBSCRIPTION_REPOSITORY)
    private readonly repo: ISubscriptionRepository,
    @Inject(PAYMENT_GATEWAY)
    private readonly gateway: IPaymentGateway,
    private readonly audit: AuditService,
  ) {}

  async execute(householdId: string, actorAuthId: string): Promise<void> {
    const sub = await this.repo.getOrCreate(householdId);
    if (!sub.stripeSubscriptionId) {
      throw new SubscriptionNotStripeLinkedException();
    }

    await this.gateway.removeSubscriptionDiscount(sub.stripeSubscriptionId);
    await this.repo.clearDiscountCache(householdId);

    await this.audit.logByAuthId(actorAuthId, {
      householdId,
      action: "subscription_changed",
      entityType: "subscription",
      entityId: sub.id,
      metadata: { operation: "remove_discount" },
    });
  }
}
