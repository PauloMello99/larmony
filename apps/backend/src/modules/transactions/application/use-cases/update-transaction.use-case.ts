import { Inject, Injectable } from "@nestjs/common";
import type { TransactionEntity } from "../../domain/transaction.entity";
import {
  ITransactionRepository,
  TRANSACTION_REPOSITORY,
  type UpdateTransactionData,
} from "../../domain/transaction.repository.interface";
import { AuditService } from "../../../audit/audit.service";

@Injectable()
export class UpdateTransactionUseCase {
  constructor(
    @Inject(TRANSACTION_REPOSITORY)
    private readonly transactionRepo: ITransactionRepository,
    private readonly auditService: AuditService,
  ) {}

  async execute(
    transactionId: string,
    householdId: string,
    authId: string,
    data: UpdateTransactionData,
  ): Promise<TransactionEntity> {
    const transaction = await this.transactionRepo.update(transactionId, householdId, data);

    await this.auditService.logByAuthId(authId, {
      householdId,
      action: "update",
      entityType: "transaction",
      entityId: transactionId,
      metadata: { fields: Object.keys(data) },
    });

    return transaction;
  }
}
