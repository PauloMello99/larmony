import type {
  StatementImportJobEntity,
  StatementImportJobStatus,
  StatementImportSource,
} from "./statement-import-job.entity";

export const STATEMENT_IMPORT_JOB_REPOSITORY = Symbol("STATEMENT_IMPORT_JOB_REPOSITORY");

export interface CreateStatementImportJobData {
  createdBy: string;
  source: StatementImportSource;
  status: StatementImportJobStatus;
}

/** RLS-enforced — usado no request do usuário (upload + leitura do próprio job). */
export interface IStatementImportJobRepository {
  create(
    householdId: string,
    data: CreateStatementImportJobData,
  ): Promise<StatementImportJobEntity>;
  findById(id: string, householdId: string): Promise<StatementImportJobEntity | null>;
  /**
   * Handshake SÍNCRONO com o processor falhou (ex.: fora do ar), ainda dentro
   * do request de upload do usuário — diferente do callback assíncrono
   * (tratado por `IStatementImportAdminRepository.completeJob`, sem RLS).
   */
  markFailedSync(
    id: string,
    householdId: string,
    errorCode: string,
    errorMessage: string,
  ): Promise<void>;
}
