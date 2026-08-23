import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { UserModule } from "../user/user.module";
import { TransactionsModule } from "../transactions/transactions.module";
import { SubscriptionsModule } from "../subscriptions/subscriptions.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { StatementImportInfrastructureModule } from "./infrastructure/statement-import-infrastructure.module";
import { CreateStatementImportJobUseCase } from "./application/use-cases/create-statement-import-job.use-case";
import { GetStatementImportJobUseCase } from "./application/use-cases/get-statement-import-job.use-case";
import { ListStatementImportCandidatesUseCase } from "./application/use-cases/list-statement-import-candidates.use-case";
import { ConfirmStatementImportCandidateUseCase } from "./application/use-cases/confirm-statement-import-candidate.use-case";
import { DismissStatementImportCandidateUseCase } from "./application/use-cases/dismiss-statement-import-candidate.use-case";
import { ProcessStatementImportCallbackUseCase } from "./application/use-cases/process-statement-import-callback.use-case";
import { SweepStatementImportTimeoutsUseCase } from "./application/use-cases/sweep-statement-import-timeouts.use-case";
import { StatementImportReconciliationJob } from "./application/jobs/statement-import-reconciliation.job";
import { StatementImportsController } from "./interface/statement-imports.controller";
import { StatementImportCallbackController } from "./interface/statement-import-callback.controller";

@Module({
  imports: [
    AuthModule,
    UserModule,
    TransactionsModule,
    SubscriptionsModule,
    NotificationsModule,
    StatementImportInfrastructureModule,
  ],
  controllers: [StatementImportsController, StatementImportCallbackController],
  providers: [
    CreateStatementImportJobUseCase,
    GetStatementImportJobUseCase,
    ListStatementImportCandidatesUseCase,
    ConfirmStatementImportCandidateUseCase,
    DismissStatementImportCandidateUseCase,
    ProcessStatementImportCallbackUseCase,
    SweepStatementImportTimeoutsUseCase,
    // Registrado no tick do internal-cron via @CronJobName (DiscoveryService).
    StatementImportReconciliationJob,
  ],
})
export class StatementImportModule {}
