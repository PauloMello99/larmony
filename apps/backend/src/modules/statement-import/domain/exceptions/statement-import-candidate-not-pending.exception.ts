import { DomainException } from "../../../../common/exceptions/domain.exception";

export class StatementImportCandidateNotPendingException extends DomainException {
  readonly code = "STATEMENT_IMPORT_CANDIDATE_NOT_PENDING";

  constructor(candidateId: string) {
    super(`Statement import candidate is not pending review: ${candidateId}`);
  }
}
