import { Inject, Injectable } from "@nestjs/common";
import type { TransactionEntity, TransactionType } from "../../domain/transaction.entity";
import {
  ITransactionRepository,
  TRANSACTION_REPOSITORY,
  type TransactionMemberInput,
} from "../../domain/transaction.repository.interface";
import { assertEqualSplitOnly } from "../../domain/split-validation";
import { AuditService } from "../../../audit/audit.service";

export interface CreateInstallmentInput {
  type: TransactionType;
  /** Total da série (dividido em `installmentCount` parcelas). */
  amountCents: number;
  description: string;
  date: string;
  installmentCount: number;
  categoryId?: string;
  personId?: string;
  notes?: string;
  /** Rateio igual replicado em cada parcela (só shares null). */
  members?: TransactionMemberInput[];
}

@Injectable()
export class CreateInstallmentTransactionUseCase {
  constructor(
    @Inject(TRANSACTION_REPOSITORY)
    private readonly transactionRepo: ITransactionRepository,
    private readonly auditService: AuditService,
  ) {}

  async execute(
    householdId: string,
    authId: string,
    userId: string,
    input: CreateInstallmentInput,
  ): Promise<TransactionEntity[]> {
    const members = input.members ?? [];
    // Combinar parcela + rateio só permite divisão igual (v1).
    assertEqualSplitOnly(members);

    const parcels = await this.transactionRepo.createInstallment(householdId, {
      createdBy: userId,
      personId: input.personId ?? userId,
      categoryId: input.categoryId ?? null,
      type: input.type,
      totalAmountCents: input.amountCents,
      description: input.description,
      firstDate: input.date,
      count: input.installmentCount,
      notes: input.notes ?? null,
      members: members.length > 0 ? members : undefined,
    });

    const groupId = parcels[0]?.installmentGroupId;
    await this.auditService.logByAuthId(authId, {
      householdId,
      action: "create",
      entityType: "installment_group",
      entityId: groupId ?? "unknown",
      metadata: {
        totalAmountCents: input.amountCents,
        count: input.installmentCount,
      },
    });

    return parcels;
  }
}
