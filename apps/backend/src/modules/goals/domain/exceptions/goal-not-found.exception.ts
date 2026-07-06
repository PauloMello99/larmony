import { DomainException } from "../../../../common/exceptions/domain.exception";

export class GoalNotFoundException extends DomainException {
  readonly code = "GOAL_NOT_FOUND";

  constructor(goalId: string) {
    super(`Goal not found: ${goalId}`);
  }
}
