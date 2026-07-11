import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { MailModule } from "../mail/mail.module";
import { DispatchNotificationUseCase } from "./application/use-cases/dispatch-notification.use-case";
import { GetNotificationPreferencesUseCase } from "./application/use-cases/get-notification-preferences.use-case";
import { UpdateNotificationPreferenceUseCase } from "./application/use-cases/update-notification-preference.use-case";
import { NotificationDedupService } from "./application/notification-dedup.service";
import { NotificationInboxService } from "./application/notification-inbox.service";
import { NotificationsInfrastructureModule } from "./infrastructure/notifications-infrastructure.module";
import { NotificationsController } from "./interface/notifications.controller";
import { NotificationPreferencesController } from "./interface/notification-preferences.controller";

@Module({
  imports: [NotificationsInfrastructureModule, MailModule, AuthModule],
  controllers: [NotificationsController, NotificationPreferencesController],
  providers: [
    DispatchNotificationUseCase,
    GetNotificationPreferencesUseCase,
    UpdateNotificationPreferenceUseCase,
    NotificationDedupService,
    NotificationInboxService,
  ],
  // DispatchNotificationUseCase + NotificationDedupService são reutilizados
  // por outros módulos (goals, budgets, reports, scheduled-transactions).
  exports: [DispatchNotificationUseCase, NotificationDedupService],
})
export class NotificationsModule {}
