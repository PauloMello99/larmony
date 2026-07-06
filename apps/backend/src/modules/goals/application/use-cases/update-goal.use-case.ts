import { Inject, Injectable } from "@nestjs/common";
import type { GoalEntity } from "../../domain/goal.entity";
import {
  GOAL_REPOSITORY,
  IGoalRepository,
  type UpdateGoalData,
} from "../../domain/goal.repository.interface";
import { AuditService } from "../../../audit/audit.service";

@Injectable()
export class UpdateGoalUseCase {
  constructor(
    @Inject(GOAL_REPOSITORY) private readonly goalRepo: IGoalRepository,
    private readonly auditService: AuditService,
  ) {}

  async execute(
    goalId: string,
    householdId: string,
    authId: string,
    data: UpdateGoalData,
  ): Promise<GoalEntity> {
    const goal = await this.goalRepo.update(goalId, householdId, data);

    await this.auditService.logByAuthId(authId, {
      householdId,
      action: "update",
      entityType: "goal",
      entityId: goalId,
      metadata: { fields: Object.keys(data) },
    });

    return goal;
  }
}
