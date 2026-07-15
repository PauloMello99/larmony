import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { UserModule } from "../user/user.module";
import { BudgetsModule } from "../budgets/budgets.module";
import { SubscriptionsModule } from "../subscriptions/subscriptions.module";
import { TransactionsInfrastructureModule } from "./infrastructure/transactions-infrastructure.module";
import { ListTransactionsUseCase } from "./application/use-cases/list-transactions.use-case";
import { CreateTransactionUseCase } from "./application/use-cases/create-transaction.use-case";
import { CreateGeneratedTransactionUseCase } from "./application/use-cases/create-generated-transaction.use-case";
import { CreateInstallmentTransactionUseCase } from "./application/use-cases/create-installment-transaction.use-case";
import { UpdateTransactionUseCase } from "./application/use-cases/update-transaction.use-case";
import { DeleteTransactionUseCase } from "./application/use-cases/delete-transaction.use-case";
import { ListTransactionMembersUseCase } from "./application/use-cases/list-transaction-members.use-case";
import { DeleteInstallmentGroupUseCase } from "./application/use-cases/delete-installment-group.use-case";
import { TransactionsController } from "./interface/transactions.controller";

@Module({
  imports: [
    AuthModule,
    UserModule,
    TransactionsInfrastructureModule,
    BudgetsModule,
    SubscriptionsModule,
  ],
  controllers: [TransactionsController],
  providers: [
    ListTransactionsUseCase,
    CreateTransactionUseCase,
    CreateGeneratedTransactionUseCase,
    CreateInstallmentTransactionUseCase,
    UpdateTransactionUseCase,
    DeleteTransactionUseCase,
    ListTransactionMembersUseCase,
    DeleteInstallmentGroupUseCase,
  ],
  exports: [CreateTransactionUseCase, CreateGeneratedTransactionUseCase],
})
export class TransactionsModule {}
