import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { SubscriptionsInfrastructureModule } from "./infrastructure/subscriptions-infrastructure.module";
import { GetSubscriptionUseCase } from "./application/use-cases/get-subscription.use-case";
import { CreateCheckoutSessionUseCase } from "./application/use-cases/create-checkout-session.use-case";
import { CreatePortalSessionUseCase } from "./application/use-cases/create-portal-session.use-case";
import { EntitlementsService } from "./application/entitlements.service";
import { SubscriptionsController } from "./interface/subscriptions.controller";

@Module({
  imports: [AuthModule, SubscriptionsInfrastructureModule],
  controllers: [SubscriptionsController],
  providers: [
    GetSubscriptionUseCase,
    CreateCheckoutSessionUseCase,
    CreatePortalSessionUseCase,
    EntitlementsService,
  ],
  // Exportado para B-4 gatear outras rotas por entitlement (mesmo padrão de
  // bridge cross-módulo do DispatchNotificationUseCase, ver ADR-0023).
  exports: [EntitlementsService],
})
export class SubscriptionsModule {}
