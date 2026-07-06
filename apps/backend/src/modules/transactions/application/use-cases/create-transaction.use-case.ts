import { Inject, Injectable } from "@nestjs/common";
import type { TransactionEntity, TransactionType } from "../../domain/transaction.entity";
import {
  ITransactionRepository,
  TRANSACTION_REPOSITORY,
} from "../../domain/transaction.repository.interface";
import { AuditService } from "../../../audit/audit.service";

export interface CreateTransactionInput {
  type: TransactionType;
  amountCents: number;
  description: string;
  date: string;
  categoryId?: string;
  personId?: string;
  notes?: string;
}

@Injectable()
export class CreateTransactionUseCase {
  constructor(
    @Inject(TRANSACTION_REPOSITORY)
    private readonly transactionRepo: ITransactionRepository,
    private readonly auditService: AuditService,
  ) {}

  async execute(
    householdId: string,
    authId: string,
    userId: string,
    input: CreateTransactionInput,
  ): Promise<TransactionEntity> {
    const transaction = await this.transactionRepo.create(householdId, {
      createdBy: userId,
      personId: input.personId ?? userId,
      categoryId: input.categoryId ?? null,
      type: input.type,
      amountCents: input.amountCents,
      description: input.description,
      date: input.date,
      notes: input.notes ?? null,
    });

    await this.auditService.logByAuthId(authId, {
      householdId,
      action: "create",
      entityType: "transaction",
      entityId: transaction.id,
      metadata: { type: transaction.type, amountCents: transaction.amountCents },
    });

    return transaction;
  }
}
