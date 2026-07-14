import { Inject, Injectable } from "@nestjs/common";
import {
  ADMIN_REPOSITORY,
  IAdminRepository,
} from "../../domain/admin.repository.interface";
import { AuditService } from "../../../audit/audit.service";
import {
  HouseholdHasActiveSubscriptionException,
  PlatformTargetNotFoundException,
} from "../../domain/exceptions/platform-admin.exceptions";
import {
  PAYMENT_GATEWAY,
  type IPaymentGateway,
} from "../../../subscriptions/domain/ports/payment-gateway.port";

/** Status locais que significam "o Stripe ainda vai cobrar este lar". */
const LIVE_STRIPE_STATUSES = ["active", "trialing", "past_due"];

/**
 * Suspensão de lar pela plataforma. Política (M15): lar com assinatura Stripe
 * VIVA não pode ser simplesmente bloqueado — cobrar com acesso suspenso é
 * inaceitável (CDC). Sem `cancelStripeSubscription` → 409 (rede de segurança);
 * com o flag → cancela no Stripe com crédito proporcional (prorate +
 * invoice_now, mesmo padrão do GrantComp), espelha o cancelamento local e só
 * então suspende. Reembolso em dinheiro, quando couber, é manual no dashboard.
 */
@Injectable()
export class SetHouseholdSuspendedUseCase {
  constructor(
    @Inject(ADMIN_REPOSITORY) private readonly adminRepo: IAdminRepository,
    @Inject(PAYMENT_GATEWAY) private readonly gateway: IPaymentGateway,
    private readonly auditService: AuditService,
  ) {}

  async execute(
    householdId: string,
    suspended: boolean,
    actorAuthId: string,
    cancelStripeSubscription = false,
  ): Promise<void> {
    let canceledStripe = false;

    if (suspended) {
      const billing = await this.adminRepo.getHouseholdBillingState(householdId);
      const liveStripeSubId =
        billing?.stripeSubscriptionId && LIVE_STRIPE_STATUSES.includes(billing.status)
          ? billing.stripeSubscriptionId
          : null;

      if (liveStripeSubId) {
        if (!cancelStripeSubscription) {
          throw new HouseholdHasActiveSubscriptionException();
        }
        await this.gateway.cancelSubscription(liveStripeSubId, {
          prorate: true,
          invoiceNow: true,
        });
        await this.adminRepo.markSubscriptionCanceled(householdId);
        canceledStripe = true;
      }
    }

    const ok = await this.adminRepo.setHouseholdSuspended(householdId, suspended);
    if (!ok) throw new PlatformTargetNotFoundException(`household ${householdId}`);

    await this.auditService.logByAuthId(actorAuthId, {
      householdId,
      action: "update",
      entityType: "household",
      entityId: householdId,
      metadata: {
        operation: suspended ? "suspend" : "unsuspend",
        canceledStripe,
      },
    });
  }
}
