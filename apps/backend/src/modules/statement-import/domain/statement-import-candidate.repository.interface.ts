import type { StatementImportCandidateEntity } from "./statement-import-candidate.entity";

export const STATEMENT_IMPORT_CANDIDATE_REPOSITORY = Symbol(
  "STATEMENT_IMPORT_CANDIDATE_REPOSITORY",
);

/** RLS-enforced — usado no request do usuário (revisão/confirmação/dispensa). */
export interface IStatementImportCandidateRepository {
  findById(id: string, householdId: string): Promise<StatementImportCandidateEntity | null>;
  listByJob(jobId: string, householdId: string): Promise<StatementImportCandidateEntity[]>;
  markConfirmed(id: string, householdId: string, transactionId: string): Promise<void>;
  markDismissed(id: string, householdId: string): Promise<void>;
}
