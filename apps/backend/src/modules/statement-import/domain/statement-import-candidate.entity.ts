export type StatementImportCandidateType = "income" | "expense";

export type CategoryConfidence = "high" | "medium" | "low";

// "duplicate" é reservado (ver schema statement-import-candidates.ts) — nenhum
// código desta fase emite este status.
export type StatementImportCandidateStatus =
  | "pending_review"
  | "confirmed"
  | "dismissed"
  | "duplicate";

export interface StatementImportCandidateEntityProps {
  id: string;
  jobId: string;
  householdId: string;
  externalId: string;
  date: string;
  amountCents: number;
  type: StatementImportCandidateType;
  description: string;
  categoryId: string | null;
  categoryConfidence: CategoryConfidence | null;
  resolvedBy: string;
  merchantKey: string | null;
  status: StatementImportCandidateStatus;
  transactionId: string | null;
  createdAt: Date;
}

export class StatementImportCandidateEntity {
  readonly id: string;
  readonly jobId: string;
  readonly householdId: string;
  readonly externalId: string;
  readonly date: string;
  readonly amountCents: number;
  readonly type: StatementImportCandidateType;
  readonly description: string;
  readonly categoryId: string | null;
  readonly categoryConfidence: CategoryConfidence | null;
  readonly resolvedBy: string;
  readonly merchantKey: string | null;
  readonly status: StatementImportCandidateStatus;
  readonly transactionId: string | null;
  readonly createdAt: Date;

  private constructor(props: StatementImportCandidateEntityProps) {
    this.id = props.id;
    this.jobId = props.jobId;
    this.householdId = props.householdId;
    this.externalId = props.externalId;
    this.date = props.date;
    this.amountCents = props.amountCents;
    this.type = props.type;
    this.description = props.description;
    this.categoryId = props.categoryId;
    this.categoryConfidence = props.categoryConfidence;
    this.resolvedBy = props.resolvedBy;
    this.merchantKey = props.merchantKey;
    this.status = props.status;
    this.transactionId = props.transactionId;
    this.createdAt = props.createdAt;
  }

  static create(props: StatementImportCandidateEntityProps): StatementImportCandidateEntity {
    return new StatementImportCandidateEntity(props);
  }
}
