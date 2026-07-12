import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { SubscriptionsInfrastructureModule } from "./infrastructure/subscriptions-infrastructure.module";
import { GetSubscriptionUseCase } from "./application/use-cases/get-subscription.use-case";
import { CreateCheckoutSessionUseCase } from "./application/use-cases/create-checkout-session.use-case";
import { CreatePortalSessionUseCase } from "./application/use-cases/create-portal-session.use-case";
import { EntitlementsService } from "./application/entitlements.service";
import { PlanCatalogService } from "./application/plan-catalog.service";
import { HandleStripeWebhookUseCase } from "./application/use-cases/handle-stripe-webhook.use-case";
import { ReconcileSubscriptionsUseCase } from "./application/use-cases/reconcile-subscriptions.use-case";
import { BillingReconciliationJob } from "./application/jobs/billing-reconciliation.job";
import { SubscriptionsController } from "./interface/subscriptions.controller";
import { StripeWebhookController } from "./interface/stripe-webhook.controller";
import { HouseholdEntitlementGuard } from "./interface/guards/household-entitlement.guard";

@Module({
  imports: [AuthModule, SubscriptionsInfrastructureModule],
  controllers: [SubscriptionsController, StripeWebhookController],
  providers: [
    GetSubscriptionUseCase,
    CreateCheckoutSessionUseCase,
    CreatePortalSessionUseCase,
    EntitlementsService,
    HouseholdEntitlementGuard,
    PlanCatalogService,
    HandleStripeWebhookUseCase,
    ReconcileSubscriptionsUseCase,
    // Registrado no tick do internal-cron via @CronJobName (DiscoveryService).
    BillingReconciliationJob,
  ],
  // Exportados para gatear rotas de outros módulos por entitlement (B-4, mesmo
  // padrão de bridge cross-módulo do DispatchNotificationUseCase, ADR-0023):
  // o consumidor importa SubscriptionsModule e usa @UseGuards(HouseholdEntitlementGuard).
  exports: [EntitlementsService, HouseholdEntitlementGuard],
})
export class SubscriptionsModule {}
