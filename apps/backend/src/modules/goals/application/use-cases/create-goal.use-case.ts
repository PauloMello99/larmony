import { Inject, Injectable } from "@nestjs/common";
import type { GoalEntity } from "../../domain/goal.entity";
import {
  GOAL_REPOSITORY,
  IGoalRepository,
  type CreateGoalData,
} from "../../domain/goal.repository.interface";
import { AuditService } from "../../../audit/audit.service";

@Injectable()
export class CreateGoalUseCase {
  constructor(
    @Inject(GOAL_REPOSITORY) private readonly goalRepo: IGoalRepository,
    private readonly auditService: AuditService,
  ) {}

  async execute(
    householdId: string,
    authId: string,
    data: CreateGoalData,
  ): Promise<GoalEntity> {
    // M16: metas são ilimitadas em qualquer plano pago (a régua de contagem do
    // Free foi removida). O acesso de escrita é gateado pelo ActiveSubscriptionGuard.
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
