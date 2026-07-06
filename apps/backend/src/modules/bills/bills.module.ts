import { Module } from "@nestjs/common";
import { NotificationsModule } from "../notifications/notifications.module";
import { BillsInfrastructureModule } from "./infrastructure/bills-infrastructure.module";
import { SendBillRemindersUseCase } from "./application/use-cases/send-bill-reminders.use-case";
import { SendBillRemindersJob } from "./application/jobs/send-bill-reminders.job";

/**
 * Fatia cron do M7: só o job de lembretes. O CRUD/telas de bills chega com o
 * M7 completo (controller + use-cases + UI).
 */
@Module({
  imports: [BillsInfrastructureModule, NotificationsModule],
  providers: [SendBillRemindersUseCase, SendBillRemindersJob],
})
export class BillsModule {}
