import type { TransactionEntity, TransactionType } from "./transaction.entity";

export const TRANSACTION_REPOSITORY = Symbol("TRANSACTION_REPOSITORY");

export interface ListTransactionsFilters {
  month?: number;
  year?: number;
  type?: TransactionType;
  categoryId?: string;
  limit: number;
  offset: number;
}

/** Item de listagem — já resolve nomes via JOIN (evita N+1 no client). */
export interface TransactionListItem {
  id: string;
  householdId: string;
  createdBy: string;
  type: TransactionType;
  amountCents: number;
  description: string;
  date: string;
  notes: string | null;
  categoryId: string | null;
  categoryName: string | null;
  categoryColor: string | null;
  categoryIcon: string | null;
  personId: string | null;
  personName: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateTransactionData {
  createdBy: string;
  personId: string | null;
  categoryId?: string | null;
  type: TransactionType;
  amountCents: number;
  description: string;
  date: string;
  notes?: string | null;
}

export interface UpdateTransactionData {
  personId?: string | null;
  categoryId?: string | null;
  type?: TransactionType;
  amountCents?: number;
  description?: string;
  date?: string;
  notes?: string | null;
}

export interface ITransactionRepository {
  findAllByHousehold(
    householdId: string,
    filters: ListTransactionsFilters,
  ): Promise<{ items: TransactionListItem[]; total: number }>;
  findById(id: string, householdId: string): Promise<TransactionEntity | null>;
  create(householdId: string, data: CreateTransactionData): Promise<TransactionEntity>;
  update(id: string, householdId: string, data: UpdateTransactionData): Promise<TransactionEntity>;
  delete(id: string, householdId: string): Promise<void>;
}
