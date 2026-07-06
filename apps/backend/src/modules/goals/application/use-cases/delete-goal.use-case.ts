import { Inject, Injectable } from "@nestjs/common";
import {
  GOAL_REPOSITORY,
  IGoalRepository,
} from "../../domain/goal.repository.interface";
import { AuditService } from "../../../audit/audit.service";

@Injectable()
export class DeleteGoalUseCase {
  constructor(
    @Inject(GOAL_REPOSITORY) private readonly goalRepo: IGoalRepository,
    private readonly auditService: AuditService,
  ) {}

  async execute(goalId: string, householdId: string, authId: string): Promise<void> {
    // Cascade (FK) apaga as contribuições junto.
    await this.goalRepo.delete(goalId, householdId);

    await this.auditService.logByAuthId(authId, {
      householdId,
      action: "delete",
      entityType: "goal",
      entityId: goalId,
    });
  }
}
