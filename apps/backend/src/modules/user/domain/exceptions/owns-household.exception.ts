import { DomainException } from "../../../../common/exceptions/domain.exception";

export class OwnsHouseholdException extends DomainException {
  readonly code = "OWNS_ORGANIZATION";

  constructor() {
    super(
      "Transfira ou exclua as lares das quais você é proprietário antes de excluir a conta",
    );
  }
}
