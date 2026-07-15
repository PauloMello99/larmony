import { Inject, Injectable } from "@nestjs/common";
import type { TransactionEntity } from "../../domain/transaction.entity";
import {
  ITransactionRepository,
  TRANSACTION_REPOSITORY,
  type CreateGeneratedData,
} from "../../domain/transaction.repository.interface";
import { NotifyIfBudgetExceededUseCase } from "../../../budgets/application/use-cases/notify-if-budget-exceeded.use-case";

/**
 * Cria uma transação gerada por um lançamento programado no modo `auto`
 * (ADR-0020). Reusado pelo engine no tick do cron (fora de request context),
 * por isso escreve via DRIZZLE_ADMIN no repositório e **não** registra
 * auditoria — geração é evento de sistema, sem authId. Exportado pelo
 * TransactionsModule para o módulo `scheduled-transactions` injetar
 * diretamente (mesmo padrão de CreateTransactionUseCase).
 */
@Injectable()
export class CreateGeneratedTransactionUseCase {
  constructor(
    @Inject(TRANSACTION_REPOSITORY)
    private readonly transactionRepo: ITransactionRepository,
    private readonly notifyIfBudgetExceeded: NotifyIfBudgetExceededUseCase,
  ) {}

  async execute(
    householdId: string,
    data: CreateGeneratedData,
  ): Promise<TransactionEntity> {
    const transaction = await this.transactionRepo.createGenerated(householdId, data);

    // Uma despesa auto também pode estourar o orçamento (M11) — o repositório
    // de budgets usa DRIZZLE_ADMIN para esta checagem especificamente, pois
    // este caminho roda fora de request context (engine no tick do cron).
    await this.notifyIfBudgetExceeded.execute({
      householdId,
      categoryId: transaction.categoryId,
      type: transaction.type,
      date: transaction.date,
      viaAdmin: true,
    });

    return transaction;
  }
}
