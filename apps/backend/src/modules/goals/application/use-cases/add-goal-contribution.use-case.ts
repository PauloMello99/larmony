import { Inject, Injectable } from "@nestjs/common";
import {
  GOAL_REPOSITORY,
  IGoalRepository,
  type CreateContributionData,
  type GoalContributionItem,
} from "../../domain/goal.repository.interface";
import { AuditService } from "../../../audit/audit.service";

@Injectable()
export class AddGoalContributionUseCase {
  constructor(
    @Inject(GOAL_REPOSITORY) private readonly goalRepo: IGoalRepository,
    private readonly auditService: AuditService,
  ) {}

  async execute(
    goalId: string,
    householdId: string,
    authId: string,
    userId: string,
    data: CreateContributionData,
  ): Promise<GoalContributionItem> {
    const contribution = await this.goalRepo.addContribution(
      goalId,
      householdId,
      userId,
      data,
    );

    await this.auditService.logByAuthId(authId, {
      householdId,
      action: "create",
      entityType: "goal_contribution",
      entityId: contribution.id,
      metadata: { goalId, amountCents: contribution.amountCents },
    });

    return contribution;
  }
}
