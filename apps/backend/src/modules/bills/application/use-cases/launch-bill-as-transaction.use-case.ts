import { Inject, Injectable } from "@nestjs/common";
import {
  BILL_REPOSITORY,
  IBillRepository,
} from "../../domain/bill.repository.interface";
import { BillNotFoundException } from "../../domain/exceptions/bill-not-found.exception";
import { CreateTransactionUseCase } from "../../../transactions/application/use-cases/create-transaction.use-case";
import type { TransactionEntity } from "../../../transactions/domain/transaction.entity";
import { toISODate } from "../../../../common/finance/due-date";

/**
 * Lança manualmente uma bill como transação de despesa (ex.: "paguei este
 * mês"). Bills nunca geram transactions automaticamente — esta é a única
 * ponte entre os dois domínios, e é sempre uma ação explícita do usuário.
 */
@Injectable()
export class LaunchBillAsTransactionUseCase {
  constructor(
    @Inject(BILL_REPOSITORY) private readonly billRepo: IBillRepository,
    private readonly createTransaction: CreateTransactionUseCase,
  ) {}

  async execute(
    billId: string,
    householdId: string,
    authId: string,
    userId: string,
  ): Promise<TransactionEntity> {
    const bill = await this.billRepo.findForLaunch(billId, householdId);
    if (!bill) throw new BillNotFoundException(billId);

    return this.createTransaction.execute(householdId, authId, userId, {
      type: "expense",
      amountCents: bill.amountCents,
      description: bill.name,
      date: toISODate(new Date()),
      categoryId: bill.categoryId ?? undefined,
    });
  }
}
