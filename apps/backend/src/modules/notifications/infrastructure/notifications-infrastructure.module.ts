import { Module } from "@nestjs/common";
import { NOTIFICATION_REPOSITORY } from "../domain/notification.repository.interface";
import { NOTIFICATION_PREFERENCE_REPOSITORY } from "../domain/notification-preference.repository.interface";
import { NOTIFICATION_DEDUP_REPOSITORY } from "../domain/notification-dedup.repository.interface";
import { SMS_SENDER } from "../domain/ports/sms-sender.port";
import { WHATSAPP_SENDER } from "../domain/ports/whatsapp-sender.port";
import { DrizzleNotificationRepository } from "./persistence/drizzle-notification.repository";
import { DrizzleNotificationPreferenceRepository } from "./persistence/drizzle-notification-preference.repository";
import { DrizzleNotificationDedupRepository } from "./persistence/drizzle-notification-dedup.repository";
import { NoopSmsSender } from "./noop-sms-sender";
import { NoopWhatsAppSender } from "./noop-whatsapp-sender";

@Module({
  providers: [
    { provide: NOTIFICATION_REPOSITORY, useClass: DrizzleNotificationRepository },
    {
      provide: NOTIFICATION_PREFERENCE_REPOSITORY,
      useClass: DrizzleNotificationPreferenceRepository,
    },
    { provide: NOTIFICATION_DEDUP_REPOSITORY, useClass: DrizzleNotificationDedupRepository },
    { provide: SMS_SENDER, useClass: NoopSmsSender },
    { provide: WHATSAPP_SENDER, useClass: NoopWhatsAppSender },
  ],
  exports: [
    NOTIFICATION_REPOSITORY,
    NOTIFICATION_PREFERENCE_REPOSITORY,
    NOTIFICATION_DEDUP_REPOSITORY,
    SMS_SENDER,
    WHATSAPP_SENDER,
  ],
})
export class NotificationsInfrastructureModule {}
