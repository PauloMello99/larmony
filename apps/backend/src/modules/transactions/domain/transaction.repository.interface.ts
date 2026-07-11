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
  installmentGroupId: string | null;
  installmentNumber: number | null;
  installmentCount: number | null;
  /** Lançamento programado que gerou a tx (ADR-0020). NULL = criada pelo usuário. */
  scheduledTransactionEntryId: string | null;
  /** Nº de participantes no rateio (0 = sem rateio). */
  memberCount: number;
  createdAt: Date;
  updatedAt: Date;
}

/** Participante do rateio na entrada (share null = divisão igual). */
export interface TransactionMemberInput {
  userId: string;
  shareAmountCents: number | null;
}

/** Participante do rateio resolvido (com nome + fatia efetiva calculada). */
export interface TransactionMemberItem {
  userId: string;
  userName: string | null;
  shareAmountCents: number | null;
  /** Fatia efetiva: específico → o valor; igual → split determinístico do amount. */
  effectiveShareCents: number;
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

export interface CreateInstallmentData {
  createdBy: string;
  personId: string | null;
  categoryId?: string | null;
  type: TransactionType;
  /** Total da série; dividido em `count` parcelas (1ª absorve a sobra). */
  totalAmountCents: number;
  description: string;
  /** Data da 1ª parcela; as demais avançam mês a mês. */
  firstDate: string;
  count: number;
  notes?: string | null;
  /** Rateio igual replicado em cada parcela (shares null). */
  members?: TransactionMemberInput[];
}

/**
 * Dados para uma transação gerada por um lançamento programado auto (ADR-0020).
 * Escrita fora de request context (cron) → o repositório usa DRIZZLE_ADMIN.
 * Sempre single (sem parcelamento/rateio no v1); `scheduledTransactionEntryId`
 * liga a tx ao lançamento que a gerou.
 */
export interface CreateGeneratedData {
  scheduledTransactionEntryId: string;
  createdBy: string;
  personId: string | null;
  categoryId: string | null;
  type: TransactionType;
  amountCents: number;
  description: string;
  date: string;
  notes: string | null;
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
  /** Cria uma transação; se `members`, grava o rateio junto. */
  create(
    householdId: string,
    data: CreateTransactionData,
    members?: TransactionMemberInput[],
  ): Promise<TransactionEntity>;
  /** Cria o grupo de parcelamento + N transações (atômico). Retorna as parcelas. */
  createInstallment(
    householdId: string,
    data: CreateInstallmentData,
  ): Promise<TransactionEntity[]>;
  /**
   * Cria uma transação gerada por recorrência (M9) via conexão ADMIN — usada
   * pelo engine no cron, sem request/RLS context. Escopo garantido pelo
   * `householdId` da própria regra.
   */
  createGenerated(
    householdId: string,
    data: CreateGeneratedData,
  ): Promise<TransactionEntity>;
  update(id: string, householdId: string, data: UpdateTransactionData): Promise<TransactionEntity>;
  delete(id: string, householdId: string): Promise<void>;
  /** Substitui o rateio de uma transação (delete + reinsert). */
  replaceMembers(
    id: string,
    householdId: string,
    members: TransactionMemberInput[],
  ): Promise<void>;
  /** Aportes do rateio, com nome e fatia efetiva. Escopado via transaction pai. */
  findMembers(id: string, householdId: string): Promise<TransactionMemberItem[]>;
  /** Exclui a série inteira (cascade nas parcelas + rateios). */
  deleteInstallmentGroup(groupId: string, householdId: string): Promise<void>;
}
