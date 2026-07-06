import { TransactionEntity, type TransactionType } from "../../domain/transaction.entity";

interface TransactionRow {
  id: string;
  householdId: string;
  createdBy: string;
  personId: string | null;
  categoryId: string | null;
  type: string;
  amountCents: number;
  description: string;
  date: string;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export class TransactionMapper {
  static toDomain(row: TransactionRow): TransactionEntity {
    return TransactionEntity.create({
      id: row.id,
      householdId: row.householdId,
      createdBy: row.createdBy,
      personId: row.personId,
      categoryId: row.categoryId,
      type: row.type as TransactionType,
      amountCents: row.amountCents,
      description: row.description,
      date: row.date,
      notes: row.notes,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }
}
