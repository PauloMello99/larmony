import { DomainException } from "../../../../common/exceptions/domain.exception";

export class CategoryNotFoundException extends DomainException {
  readonly code = "CATEGORY_NOT_FOUND";

  constructor(categoryId: string) {
    super(`Category not found: ${categoryId}`);
  }
}
