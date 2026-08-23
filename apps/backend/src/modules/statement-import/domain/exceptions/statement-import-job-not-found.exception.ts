import { DomainException } from "../../../../common/exceptions/domain.exception";

export class StatementImportJobNotFoundException extends DomainException {
  readonly code = "STATEMENT_IMPORT_JOB_NOT_FOUND";

  constructor(jobId: string) {
    super(`Statement import job not found: ${jobId}`);
  }
}
