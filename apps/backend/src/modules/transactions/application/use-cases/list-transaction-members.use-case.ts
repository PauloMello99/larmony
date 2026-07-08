import { Inject, Injectable } from "@nestjs/common";
import {
  ITransactionRepository,
  TRANSACTION_REPOSITORY,
  type TransactionMemberItem,
} from "../../domain/transaction.repository.interface";

@Injectable()
export class ListTransactionMembersUseCase {
  constructor(
    @Inject(TRANSACTION_REPOSITORY)
    private readonly transactionRepo: ITransactionRepository,
  ) {}

  execute(transactionId: string, householdId: string): Promise<TransactionMemberItem[]> {
    return this.transactionRepo.findMembers(transactionId, householdId);
  }
}
