import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { DatabaseModule } from "../../../database/database.module";
import { SUBSCRIPTION_REPOSITORY } from "../domain/subscription.repository.interface";
import { BILLING_PLAN_REPOSITORY } from "../domain/billing-plan.repository.interface";
import { STRIPE_WEBHOOK_EVENT_REPOSITORY } from "../domain/stripe-webhook-event.repository.interface";
import { BILLING_INVOICE_EVENT_REPOSITORY } from "../domain/billing-invoice-event.repository.interface";
import { PAYMENT_GATEWAY } from "../domain/ports/payment-gateway.port";
import { DrizzleSubscriptionRepository } from "./persistence/drizzle-subscription.repository";
import { DrizzleBillingPlanRepository } from "./persistence/drizzle-billing-plan.repository";
import { DrizzleStripeWebhookEventRepository } from "./persistence/drizzle-stripe-webhook-event.repository";
import { DrizzleBillingInvoiceEventRepository } from "./persistence/drizzle-billing-invoice-event.repository";
import { StripePaymentGateway } from "./stripe-payment-gateway";

@Module({
  imports: [DatabaseModule, ConfigModule],
  providers: [
    { provide: SUBSCRIPTION_REPOSITORY, useClass: DrizzleSubscriptionRepository },
    { provide: BILLING_PLAN_REPOSITORY, useClass: DrizzleBillingPlanRepository },
    {
      provide: STRIPE_WEBHOOK_EVENT_REPOSITORY,
      useClass: DrizzleStripeWebhookEventRepository,
    },
    {
      provide: BILLING_INVOICE_EVENT_REPOSITORY,
      useClass: DrizzleBillingInvoiceEventRepository,
    },
    { provide: PAYMENT_GATEWAY, useClass: StripePaymentGateway },
  ],
  exports: [
    SUBSCRIPTION_REPOSITORY,
    BILLING_PLAN_REPOSITORY,
    STRIPE_WEBHOOK_EVENT_REPOSITORY,
    BILLING_INVOICE_EVENT_REPOSITORY,
    PAYMENT_GATEWAY,
  ],
})
export class SubscriptionsInfrastructureModule {}
