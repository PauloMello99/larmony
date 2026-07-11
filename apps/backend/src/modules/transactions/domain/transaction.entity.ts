export type TransactionType = "income" | "expense";

export interface TransactionEntityProps {
  id: string;
  householdId: string;
  createdBy: string;
  personId: string | null;
  categoryId: string | null;
  type: TransactionType;
  amountCents: number;
  description: string;
  date: string;
  notes: string | null;
  installmentGroupId: string | null;
  installmentNumber: number | null;
  installmentCount: number | null;
  scheduledTransactionEntryId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export class TransactionEntity {
  readonly id: string;
  readonly householdId: string;
  readonly createdBy: string;
  readonly personId: string | null;
  readonly categoryId: string | null;
  readonly type: TransactionType;
  readonly amountCents: number;
  readonly description: string;
  readonly date: string;
  readonly notes: string | null;
  readonly installmentGroupId: string | null;
  readonly installmentNumber: number | null;
  readonly installmentCount: number | null;
  readonly scheduledTransactionEntryId: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  private constructor(props: TransactionEntityProps) {
    this.id = props.id;
    this.householdId = props.householdId;
    this.createdBy = props.createdBy;
    this.personId = props.personId;
    this.categoryId = props.categoryId;
    this.type = props.type;
    this.amountCents = props.amountCents;
    this.description = props.description;
    this.date = props.date;
    this.notes = props.notes;
    this.installmentGroupId = props.installmentGroupId;
    this.installmentNumber = props.installmentNumber;
    this.installmentCount = props.installmentCount;
    this.scheduledTransactionEntryId = props.scheduledTransactionEntryId;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  static create(props: TransactionEntityProps): TransactionEntity {
    return new TransactionEntity(props);
  }
}
