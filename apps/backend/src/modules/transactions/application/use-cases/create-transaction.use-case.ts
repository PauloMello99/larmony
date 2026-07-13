import { Inject, Injectable } from "@nestjs/common";
import type { TransactionEntity, TransactionType } from "../../domain/transaction.entity";
import {
  ITransactionRepository,
  TRANSACTION_REPOSITORY,
  type TransactionMemberInput,
} from "../../domain/transaction.repository.interface";
import { assertValidSplit } from "../../domain/split-validation";
import { AuditService } from "../../../audit/audit.service";
import { NotifyIfBudgetExceededUseCase } from "../../../budgets/application/use-cases/notify-if-budget-exceeded.use-case";

export interface CreateTransactionInput {
  type: TransactionType;
  amountCents: number;
  description: string;
  date: string;
  categoryId?: string;
  personId?: string;
  notes?: string;
  /** Rateio opcional (share null = divisão igual). */
  members?: TransactionMemberInput[];
}

@Injectable()
export class CreateTransactionUseCase {
  constructor(
    @Inject(TRANSACTION_REPOSITORY)
    private readonly transactionRepo: ITransactionRepository,
    private readonly auditService: AuditService,
    private readonly notifyIfBudgetExceeded: NotifyIfBudgetExceededUseCase,
  ) {}

  async execute(
    householdId: string,
    authId: string,
    userId: string,
    input: CreateTransactionInput,
  ): Promise<TransactionEntity> {
    const members = input.members ?? [];
    assertValidSplit(members, input.amountCents);

    const transaction = await this.transactionRepo.create(
      householdId,
      {
        createdBy: userId,
        personId: input.personId ?? userId,
        categoryId: input.categoryId ?? null,
        type: input.type,
        amountCents: input.amountCents,
        description: input.description,
        date: input.date,
        notes: input.notes ?? null,
      },
      members.length > 0 ? members : undefined,
    );

    await this.auditService.logByAuthId(authId, {
      householdId,
      action: "create",
      entityType: "transaction",
      entityId: transaction.id,
      metadata: { type: transaction.type, amountCents: transaction.amountCents },
    });

    await this.notifyIfBudgetExceeded.execute({
      householdId,
      categoryId: transaction.categoryId,
      type: transaction.type,
      date: transaction.date,
    });

    return transaction;
  }
}
