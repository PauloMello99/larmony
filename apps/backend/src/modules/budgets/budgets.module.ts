import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { SubscriptionsModule } from "../subscriptions/subscriptions.module";
import { BudgetsInfrastructureModule } from "./infrastructure/budgets-infrastructure.module";
import { ListBudgetsUseCase } from "./application/use-cases/list-budgets.use-case";
import { CreateBudgetUseCase } from "./application/use-cases/create-budget.use-case";
import { UpdateBudgetUseCase } from "./application/use-cases/update-budget.use-case";
import { DeleteBudgetUseCase } from "./application/use-cases/delete-budget.use-case";
import { NotifyIfBudgetExceededUseCase } from "./application/use-cases/notify-if-budget-exceeded.use-case";
import { BudgetsController } from "./interface/budgets.controller";

@Module({
  imports: [AuthModule, BudgetsInfrastructureModule, NotificationsModule, SubscriptionsModule],
  controllers: [BudgetsController],
  providers: [
    ListBudgetsUseCase,
    CreateBudgetUseCase,
    UpdateBudgetUseCase,
    DeleteBudgetUseCase,
    NotifyIfBudgetExceededUseCase,
  ],
  // Reusado por transactions (CreateTransactionUseCase, CreateInstallment…,
  // CreateGeneratedTransactionUseCase) para checar estouro após cada escrita.
  exports: [NotifyIfBudgetExceededUseCase],
})
export class BudgetsModule {}
