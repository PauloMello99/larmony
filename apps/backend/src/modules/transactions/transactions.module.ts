import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { UserModule } from "../user/user.module";
import { TransactionsInfrastructureModule } from "./infrastructure/transactions-infrastructure.module";
import { ListTransactionsUseCase } from "./application/use-cases/list-transactions.use-case";
import { CreateTransactionUseCase } from "./application/use-cases/create-transaction.use-case";
import { UpdateTransactionUseCase } from "./application/use-cases/update-transaction.use-case";
import { DeleteTransactionUseCase } from "./application/use-cases/delete-transaction.use-case";
import { TransactionsController } from "./interface/transactions.controller";

@Module({
  imports: [AuthModule, UserModule, TransactionsInfrastructureModule],
  controllers: [TransactionsController],
  providers: [
    ListTransactionsUseCase,
    CreateTransactionUseCase,
    UpdateTransactionUseCase,
    DeleteTransactionUseCase,
  ],
})
export class TransactionsModule {}
