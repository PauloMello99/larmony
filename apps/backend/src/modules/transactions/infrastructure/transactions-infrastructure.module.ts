import { Module } from "@nestjs/common";
import { DatabaseModule } from "../../../database/database.module";
import { TRANSACTION_REPOSITORY } from "../domain/transaction.repository.interface";
import { DrizzleTransactionRepository } from "./persistence/drizzle-transaction.repository";

@Module({
  imports: [DatabaseModule],
  providers: [{ provide: TRANSACTION_REPOSITORY, useClass: DrizzleTransactionRepository }],
  exports: [TRANSACTION_REPOSITORY],
})
export class TransactionsInfrastructureModule {}
