import { Inject, Injectable } from "@nestjs/common";
import type { TransactionEntity } from "../../domain/transaction.entity";
import {
  ITransactionRepository,
  TRANSACTION_REPOSITORY,
  type CreateGeneratedData,
} from "../../domain/transaction.repository.interface";

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
  ) {}

  execute(
    householdId: string,
    data: CreateGeneratedData,
  ): Promise<TransactionEntity> {
    return this.transactionRepo.createGenerated(householdId, data);
  }
}
