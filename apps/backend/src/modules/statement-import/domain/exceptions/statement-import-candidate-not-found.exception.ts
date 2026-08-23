import { DomainException } from "../../../../common/exceptions/domain.exception";

export class StatementImportCandidateNotFoundException extends DomainException {
  readonly code = "STATEMENT_IMPORT_CANDIDATE_NOT_FOUND";

  constructor(candidateId: string) {
    super(`Statement import candidate not found: ${candidateId}`);
  }
}
