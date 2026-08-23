export type StatementImportSource = "csv" | "ofx" | "pdf";

export type StatementImportJobStatus = "pending" | "processing" | "completed" | "failed";

export interface StatementImportJobEntityProps {
  id: string;
  householdId: string;
  createdBy: string;
  source: StatementImportSource;
  status: StatementImportJobStatus;
  errorCode: string | null;
  errorMessage: string | null;
  stats: unknown;
  createdAt: Date;
  completedAt: Date | null;
}

export class StatementImportJobEntity {
  readonly id: string;
  readonly householdId: string;
  readonly createdBy: string;
  readonly source: StatementImportSource;
  readonly status: StatementImportJobStatus;
  readonly errorCode: string | null;
  readonly errorMessage: string | null;
  readonly stats: unknown;
  readonly createdAt: Date;
  readonly completedAt: Date | null;

  private constructor(props: StatementImportJobEntityProps) {
    this.id = props.id;
    this.householdId = props.householdId;
    this.createdBy = props.createdBy;
    this.source = props.source;
    this.status = props.status;
    this.errorCode = props.errorCode;
    this.errorMessage = props.errorMessage;
    this.stats = props.stats;
    this.createdAt = props.createdAt;
    this.completedAt = props.completedAt;
  }

  static create(props: StatementImportJobEntityProps): StatementImportJobEntity {
    return new StatementImportJobEntity(props);
  }
}
