import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { UserModule } from "../user/user.module";
import { TransactionsModule } from "../transactions/transactions.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { ScheduledTransactionsInfrastructureModule } from "./infrastructure/scheduled-transactions-infrastructure.module";
import { ListScheduledEntriesUseCase } from "./application/use-cases/list-scheduled-entries.use-case";
import { CreateScheduledEntryUseCase } from "./application/use-cases/create-scheduled-entry.use-case";
import { UpdateScheduledEntryUseCase } from "./application/use-cases/update-scheduled-entry.use-case";
import { DeleteScheduledEntryUseCase } from "./application/use-cases/delete-scheduled-entry.use-case";
import { LaunchScheduledEntryUseCase } from "./application/use-cases/launch-scheduled-entry.use-case";
import { RunScheduledEntriesEngineUseCase } from "./application/use-cases/run-scheduled-entries-engine.use-case";
import { SendScheduledEntryRemindersUseCase } from "./application/use-cases/send-scheduled-entry-reminders.use-case";
import { ScheduledEntriesEngineJob } from "./application/jobs/scheduled-entries-engine.job";
import { ScheduledEntriesRemindersJob } from "./application/jobs/scheduled-entries-reminders.job";
import { ScheduledTransactionsController } from "./interface/scheduled-transactions.controller";

@Module({
  imports: [
    AuthModule,
    UserModule,
    TransactionsModule,
    ScheduledTransactionsInfrastructureModule,
    NotificationsModule,
  ],
  controllers: [ScheduledTransactionsController],
  providers: [
    // CRUD + launch
    ListScheduledEntriesUseCase,
    CreateScheduledEntryUseCase,
    UpdateScheduledEntryUseCase,
    DeleteScheduledEntryUseCase,
    LaunchScheduledEntryUseCase,
    // Engine (modo auto) — fatia cron
    RunScheduledEntriesEngineUseCase,
    ScheduledEntriesEngineJob,
    // Lembrete (modo manual) — fatia cron
    SendScheduledEntryRemindersUseCase,
    ScheduledEntriesRemindersJob,
  ],
})
export class ScheduledTransactionsModule {}
