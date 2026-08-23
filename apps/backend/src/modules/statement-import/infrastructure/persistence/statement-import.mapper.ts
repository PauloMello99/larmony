import {
  StatementImportJobEntity,
  type StatementImportJobStatus,
  type StatementImportSource,
} from "../../domain/statement-import-job.entity";
import {
  StatementImportCandidateEntity,
  type CategoryConfidence,
  type StatementImportCandidateStatus,
  type StatementImportCandidateType,
} from "../../domain/statement-import-candidate.entity";

interface StatementImportJobRow {
  id: string;
  householdId: string;
  createdBy: string;
  source: string;
  status: string;
  errorCode: string | null;
  errorMessage: string | null;
  stats: unknown;
  createdAt: Date;
  completedAt: Date | null;
}

interface StatementImportCandidateRow {
  id: string;
  jobId: string;
  householdId: string;
  externalId: string;
  date: string;
  amountCents: number;
  type: string;
  description: string;
  categoryId: string | null;
  categoryConfidence: string | null;
  resolvedBy: string;
  merchantKey: string | null;
  status: string;
  transactionId: string | null;
  createdAt: Date;
}

export class StatementImportJobMapper {
  static toDomain(row: StatementImportJobRow): StatementImportJobEntity {
    return StatementImportJobEntity.create({
      id: row.id,
      householdId: row.householdId,
      createdBy: row.createdBy,
      source: row.source as StatementImportSource,
      status: row.status as StatementImportJobStatus,
      errorCode: row.errorCode,
      errorMessage: row.errorMessage,
      stats: row.stats,
      createdAt: row.createdAt,
      completedAt: row.completedAt,
    });
  }
}

export class StatementImportCandidateMapper {
  static toDomain(row: StatementImportCandidateRow): StatementImportCandidateEntity {
    return StatementImportCandidateEntity.create({
      id: row.id,
      jobId: row.jobId,
      householdId: row.householdId,
      externalId: row.externalId,
      date: row.date,
      amountCents: row.amountCents,
      type: row.type as StatementImportCandidateType,
      description: row.description,
      categoryId: row.categoryId,
      categoryConfidence: row.categoryConfidence as CategoryConfidence | null,
      resolvedBy: row.resolvedBy,
      merchantKey: row.merchantKey,
      status: row.status as StatementImportCandidateStatus,
      transactionId: row.transactionId,
      createdAt: row.createdAt,
    });
  }
}
