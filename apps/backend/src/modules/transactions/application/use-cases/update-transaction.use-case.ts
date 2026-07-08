import { Inject, Injectable } from "@nestjs/common";
import type { TransactionEntity } from "../../domain/transaction.entity";
import {
  ITransactionRepository,
  TRANSACTION_REPOSITORY,
  type TransactionMemberInput,
  type UpdateTransactionData,
} from "../../domain/transaction.repository.interface";
import { assertValidSplit } from "../../domain/split-validation";
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
    members?: TransactionMemberInput[],
  ): Promise<TransactionEntity> {
    const transaction = await this.transactionRepo.update(transactionId, householdId, data);

    // Rateio (opcional): substitui a lista atual. Valida contra o valor efetivo.
    if (members !== undefined) {
      assertValidSplit(members, transaction.amountCents);
      await this.transactionRepo.replaceMembers(transactionId, householdId, members);
    }

    await this.auditService.logByAuthId(authId, {
      householdId,
      action: "update",
      entityType: "transaction",
      entityId: transactionId,
      metadata: {
        fields: Object.keys(data),
        ...(members !== undefined ? { membersReplaced: members.length } : {}),
      },
    });

    return transaction;
  }
}
