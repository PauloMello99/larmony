import { DomainException } from "../../../../common/exceptions/domain.exception";

export class StatementImportDisabledException extends DomainException {
  readonly code = "STATEMENT_IMPORT_DISABLED";

  constructor() {
    super("Import de extrato está desabilitado neste ambiente (STATEMENT_IMPORT_ENABLED=false).");
  }
}
