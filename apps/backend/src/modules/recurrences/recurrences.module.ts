import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { UserModule } from "../user/user.module";
import { TransactionsModule } from "../transactions/transactions.module";
import { RecurrencesInfrastructureModule } from "./infrastructure/recurrences-infrastructure.module";
import { ListRecurrencesUseCase } from "./application/use-cases/list-recurrences.use-case";
import { CreateRecurrenceUseCase } from "./application/use-cases/create-recurrence.use-case";
import { UpdateRecurrenceUseCase } from "./application/use-cases/update-recurrence.use-case";
import { DeleteRecurrenceUseCase } from "./application/use-cases/delete-recurrence.use-case";
import { RunRecurrenceEngineUseCase } from "./application/use-cases/run-recurrence-engine.use-case";
import { RecurrenceEngineJob } from "./application/jobs/recurrence-engine.job";
import { RecurrencesController } from "./interface/recurrences.controller";

@Module({
  imports: [AuthModule, UserModule, TransactionsModule, RecurrencesInfrastructureModule],
  controllers: [RecurrencesController],
  providers: [
    // CRUD
    ListRecurrencesUseCase,
    CreateRecurrenceUseCase,
    UpdateRecurrenceUseCase,
    DeleteRecurrenceUseCase,
    // Engine (fatia cron — plugado via @CronJobName)
    RunRecurrenceEngineUseCase,
    RecurrenceEngineJob,
  ],
})
export class RecurrencesModule {}
