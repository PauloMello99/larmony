import { Inject, Injectable } from "@nestjs/common";
import {
  GOAL_REPOSITORY,
  IGoalRepository,
} from "../../domain/goal.repository.interface";
import { AuditService } from "../../../audit/audit.service";

@Injectable()
export class DeleteGoalContributionUseCase {
  constructor(
    @Inject(GOAL_REPOSITORY) private readonly goalRepo: IGoalRepository,
    private readonly auditService: AuditService,
  ) {}

  async execute(
    contributionId: string,
    goalId: string,
    householdId: string,
    authId: string,
  ): Promise<void> {
    await this.goalRepo.deleteContribution(contributionId, goalId, householdId);

    await this.auditService.logByAuthId(authId, {
      householdId,
      action: "delete",
      entityType: "goal_contribution",
      entityId: contributionId,
      metadata: { goalId },
    });
  }
}
