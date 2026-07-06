import { Inject, Injectable } from "@nestjs/common";
import {
  ITransactionRepository,
  TRANSACTION_REPOSITORY,
  type ListTransactionsFilters,
  type TransactionListItem,
} from "../../domain/transaction.repository.interface";

@Injectable()
export class ListTransactionsUseCase {
  constructor(
    @Inject(TRANSACTION_REPOSITORY)
    private readonly transactionRepo: ITransactionRepository,
  ) {}

  execute(
    householdId: string,
    filters: ListTransactionsFilters,
  ): Promise<{ items: TransactionListItem[]; total: number }> {
    return this.transactionRepo.findAllByHousehold(householdId, filters);
  }
}
