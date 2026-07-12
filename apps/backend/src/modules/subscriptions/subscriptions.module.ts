import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { UserInfrastructureModule } from "../user/infrastructure/user-infrastructure.module";
import { SubscriptionsInfrastructureModule } from "./infrastructure/subscriptions-infrastructure.module";
import { GetSubscriptionUseCase } from "./application/use-cases/get-subscription.use-case";
import { CreateCheckoutSessionUseCase } from "./application/use-cases/create-checkout-session.use-case";
import { CreatePortalSessionUseCase } from "./application/use-cases/create-portal-session.use-case";
import { EntitlementsService } from "./application/entitlements.service";
import { PlanCatalogService } from "./application/plan-catalog.service";
import { HandleStripeWebhookUseCase } from "./application/use-cases/handle-stripe-webhook.use-case";
import { ReconcileSubscriptionsUseCase } from "./application/use-cases/reconcile-subscriptions.use-case";
import { GrantCompUseCase } from "./application/use-cases/grant-comp.use-case";
import { RevokeCompUseCase } from "./application/use-cases/revoke-comp.use-case";
import { ApplyDiscountUseCase } from "./application/use-cases/apply-discount.use-case";
import { RemoveDiscountUseCase } from "./application/use-cases/remove-discount.use-case";
import { ExpireSubscriptionsUseCase } from "./application/use-cases/expire-subscriptions.use-case";
import { BillingReconciliationJob } from "./application/jobs/billing-reconciliation.job";
import { BillingExpirySweepJob } from "./application/jobs/billing-expiry-sweep.job";
import { SubscriptionsController } from "./interface/subscriptions.controller";
import { StripeWebhookController } from "./interface/stripe-webhook.controller";
import { AdminSubscriptionController } from "./interface/admin-subscription.controller";
import { HouseholdEntitlementGuard } from "./interface/guards/household-entitlement.guard";

@Module({
  // UserInfrastructureModule: GrantCompUseCase resolve o users.id do ator
  // (compGrantedBy) via USER_REPOSITORY. AuditService é global (AuditModule).
  imports: [AuthModule, SubscriptionsInfrastructureModule, UserInfrastructureModule],
  controllers: [
    SubscriptionsController,
    StripeWebhookController,
    AdminSubscriptionController,
  ],
  providers: [
    GetSubscriptionUseCase,
    CreateCheckoutSessionUseCase,
    CreatePortalSessionUseCase,
    EntitlementsService,
    HouseholdEntitlementGuard,
    PlanCatalogService,
    HandleStripeWebhookUseCase,
    ReconcileSubscriptionsUseCase,
    GrantCompUseCase,
    RevokeCompUseCase,
    ApplyDiscountUseCase,
    RemoveDiscountUseCase,
    ExpireSubscriptionsUseCase,
    // Registrados no tick do internal-cron via @CronJobName (DiscoveryService).
    BillingReconciliationJob,
    BillingExpirySweepJob,
  ],
  // Exportados para gatear rotas de outros módulos por entitlement (B-4, mesmo
  // padrão de bridge cross-módulo do DispatchNotificationUseCase, ADR-0023):
  // o consumidor importa SubscriptionsModule e usa @UseGuards(HouseholdEntitlementGuard).
  exports: [EntitlementsService, HouseholdEntitlementGuard],
})
export class SubscriptionsModule {}
