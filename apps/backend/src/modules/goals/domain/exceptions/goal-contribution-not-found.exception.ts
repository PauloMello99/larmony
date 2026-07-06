import { DomainException } from "../../../../common/exceptions/domain.exception";

export class GoalContributionNotFoundException extends DomainException {
  readonly code = "GOAL_CONTRIBUTION_NOT_FOUND";

  constructor(contributionId: string) {
    super(`Goal contribution not found: ${contributionId}`);
  }
}
