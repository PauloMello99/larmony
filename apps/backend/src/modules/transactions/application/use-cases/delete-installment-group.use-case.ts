import { Inject, Injectable } from "@nestjs/common";
import {
  ITransactionRepository,
  TRANSACTION_REPOSITORY,
} from "../../domain/transaction.repository.interface";
import { AuditService } from "../../../audit/audit.service";

@Injectable()
export class DeleteInstallmentGroupUseCase {
  constructor(
    @Inject(TRANSACTION_REPOSITORY)
    private readonly transactionRepo: ITransactionRepository,
    private readonly auditService: AuditService,
  ) {}

  async execute(groupId: string, householdId: string, authId: string): Promise<void> {
    // Cascade (FK) remove todas as parcelas + seus rateios.
    await this.transactionRepo.deleteInstallmentGroup(groupId, householdId);

    await this.auditService.logByAuthId(authId, {
      householdId,
      action: "delete",
      entityType: "installment_group",
      entityId: groupId,
    });
  }
}
