import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { DatabaseModule } from "../../../database/database.module";
import { SUBSCRIPTION_REPOSITORY } from "../domain/subscription.repository.interface";
import { PAYMENT_GATEWAY } from "../domain/ports/payment-gateway.port";
import { DrizzleSubscriptionRepository } from "./persistence/drizzle-subscription.repository";
import { StripePaymentGateway } from "./stripe-payment-gateway";

@Module({
  imports: [DatabaseModule, ConfigModule],
  providers: [
    { provide: SUBSCRIPTION_REPOSITORY, useClass: DrizzleSubscriptionRepository },
    { provide: PAYMENT_GATEWAY, useClass: StripePaymentGateway },
  ],
  exports: [SUBSCRIPTION_REPOSITORY, PAYMENT_GATEWAY],
})
export class SubscriptionsInfrastructureModule {}
