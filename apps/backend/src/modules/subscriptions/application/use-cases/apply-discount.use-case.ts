import { Inject, Injectable } from "@nestjs/common";
import {
  SUBSCRIPTION_REPOSITORY,
  type ISubscriptionRepository,
} from "../../domain/subscription.repository.interface";
import {
  PAYMENT_GATEWAY,
  type IPaymentGateway,
  type CouponDuration,
} from "../../domain/ports/payment-gateway.port";
import { AuditService } from "../../../audit/audit.service";
import { InvalidDiscountException } from "../../domain/exceptions/invalid-discount.exception";
import { SubscriptionNotStripeLinkedException } from "../../domain/exceptions/subscription-not-stripe-linked.exception";

export interface ApplyDiscountCommand {
  percent?: number;
  amountCents?: number;
  duration: CouponDuration;
  durationInMonths?: number;
}

/** Moeda dos coupons de valor fixo — o catálogo hoje é BRL (plan-catalog.ts). */
const DISCOUNT_CURRENCY = "brl";

/**
 * Aplica um desconto a um lar via Stripe Coupon (ADR-0026 §3, B-7). O desconto
 * SEMPRE passa pela API do Stripe (é quem cobra); `stripeCouponId`/
 * `discountPercent` locais são só cache de exibição.
 */
@Injectable()
export class ApplyDiscountUseCase {
  constructor(
    @Inject(SUBSCRIPTION_REPOSITORY)
    private readonly repo: ISubscriptionRepository,
    @Inject(PAYMENT_GATEWAY)
    private readonly gateway: IPaymentGateway,
    private readonly audit: AuditService,
  ) {}

  async execute(
    householdId: string,
    command: ApplyDiscountCommand,
    actorAuthId: string,
  ): Promise<void> {
    const hasPercent = command.percent !== undefined && command.percent !== null;
    const hasAmount =
      command.amountCents !== undefined && command.amountCents !== null;

    // Exatamente um de percent / amountCents.
    if (hasPercent === hasAmount) {
      throw new InvalidDiscountException(
        "Informe exatamente um de percent ou amountCents.",
      );
    }
    if (hasPercent && (command.percent! < 1 || command.percent! > 100)) {
      throw new InvalidDiscountException("percent deve estar entre 1 e 100.");
    }
    if (hasAmount && command.amountCents! < 1) {
      throw new InvalidDiscountException("amountCents deve ser positivo.");
    }
    if (command.duration === "repeating" && !command.durationInMonths) {
      throw new InvalidDiscountException(
        "durationInMonths é obrigatório quando duration é 'repeating'.",
      );
    }

    const sub = await this.repo.getOrCreate(householdId);
    if (!sub.stripeSubscriptionId) {
      throw new SubscriptionNotStripeLinkedException();
    }

    const { couponId } = await this.gateway.createCoupon({
      percentOff: hasPercent ? command.percent : undefined,
      amountOffCents: hasAmount ? command.amountCents : undefined,
      currency: hasAmount ? DISCOUNT_CURRENCY : undefined,
      duration: command.duration,
      durationInMonths:
        command.duration === "repeating" ? command.durationInMonths : undefined,
    });
    await this.gateway.applyCouponToSubscription(sub.stripeSubscriptionId, couponId);
    await this.repo.setDiscountCache(householdId, {
      stripeCouponId: couponId,
      discountPercent: hasPercent ? command.percent! : null,
    });

    await this.audit.logByAuthId(actorAuthId, {
      householdId,
      action: "subscription_changed",
      entityType: "subscription",
      entityId: sub.id,
      metadata: {
        operation: "apply_discount",
        ...(hasPercent
          ? { percent: command.percent }
          : { amountCents: command.amountCents }),
      },
    });
  }
}
