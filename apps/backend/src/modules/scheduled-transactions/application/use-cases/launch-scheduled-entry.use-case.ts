import { Inject, Injectable } from "@nestjs/common";
import {
  IScheduledEntryRepository,
  SCHEDULED_ENTRY_REPOSITORY,
} from "../../domain/scheduled-entry.repository.interface";
import { ScheduledEntryNotFoundException } from "../../domain/exceptions/scheduled-entry-not-found.exception";
import { ScheduledEntryNotManualException } from "../../domain/exceptions/scheduled-entry-not-manual.exception";
import { CreateTransactionUseCase } from "../../../transactions/application/use-cases/create-transaction.use-case";
import type { TransactionEntity } from "../../../transactions/domain/transaction.entity";
import { toISODate } from "../../../../common/finance/due-date";

/**
 * Lança manualmente uma entrada `manual` como transação (ex.: "paguei este
 * mês"). Entradas `manual` nunca geram transactions automaticamente — esta é
 * a única ponte entre os dois domínios, e é sempre uma ação explícita do
 * usuário. Entradas `auto` já são postadas pelo engine — lançar de novo aqui
 * criaria uma duplicata, então é bloqueado (ScheduledEntryNotManualException).
 */
@Injectable()
export class LaunchScheduledEntryUseCase {
  constructor(
    @Inject(SCHEDULED_ENTRY_REPOSITORY)
    private readonly entryRepo: IScheduledEntryRepository,
    private readonly createTransaction: CreateTransactionUseCase,
  ) {}

  async execute(
    entryId: string,
    householdId: string,
    authId: string,
    userId: string,
  ): Promise<TransactionEntity> {
    const entry = await this.entryRepo.findForLaunch(entryId, householdId);
    if (!entry) throw new ScheduledEntryNotFoundException(entryId);
    if (entry.postingMode !== "manual") throw new ScheduledEntryNotManualException(entryId);

    return this.createTransaction.execute(householdId, authId, userId, {
      type: entry.type,
      amountCents: entry.amountCents,
      description: entry.description,
      date: toISODate(new Date()),
      categoryId: entry.categoryId ?? undefined,
    });
  }
}
