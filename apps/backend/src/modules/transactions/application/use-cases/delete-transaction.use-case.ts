import { Inject, Injectable } from "@nestjs/common";
import {
  ITransactionRepository,
  TRANSACTION_REPOSITORY,
} from "../../domain/transaction.repository.interface";
import { AuditService } from "../../../audit/audit.service";

@Injectable()
export class DeleteTransactionUseCase {
  constructor(
    @Inject(TRANSACTION_REPOSITORY)
    private readonly transactionRepo: ITransactionRepository,
    private readonly auditService: AuditService,
  ) {}

  async execute(transactionId: string, householdId: string, authId: string): Promise<void> {
    await this.transactionRepo.delete(transactionId, householdId);

    await this.auditService.logByAuthId(authId, {
      householdId,
      action: "delete",
      entityType: "transaction",
      entityId: transactionId,
    });
  }
}
