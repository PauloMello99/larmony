import { Inject, Injectable } from "@nestjs/common";
import type { GoalEntity } from "../../domain/goal.entity";
import {
  GOAL_REPOSITORY,
  IGoalRepository,
  type CreateGoalData,
} from "../../domain/goal.repository.interface";
import { AuditService } from "../../../audit/audit.service";
import { EntitlementsService } from "../../../subscriptions/application/entitlements.service";
import { GoalLimitReachedException } from "../../domain/exceptions/goal-limit-reached.exception";

@Injectable()
export class CreateGoalUseCase {
  constructor(
    @Inject(GOAL_REPOSITORY) private readonly goalRepo: IGoalRepository,
    private readonly auditService: AuditService,
    private readonly entitlements: EntitlementsService,
  ) {}

  async execute(
    householdId: string,
    authId: string,
    data: CreateGoalData,
  ): Promise<GoalEntity> {
    // Régua do Free (D-1, P-5): metas não têm status de conclusão hoje — o
    // limite é a contagem total de metas do lar.
    const { limits } = await this.entitlements.resolve(householdId);
    const current = await this.goalRepo.findAllByHousehold(householdId);
    if (current.length >= limits.maxActiveGoals) {
      throw new GoalLimitReachedException(limits.maxActiveGoals);
    }

    const goal = await this.goalRepo.create(householdId, data);

    await this.auditService.logByAuthId(authId, {
      householdId,
      action: "create",
      entityType: "goal",
      entityId: goal.id,
      metadata: { name: goal.name, targetAmountCents: goal.targetAmountCents },
    });

    return goal;
  }
}
