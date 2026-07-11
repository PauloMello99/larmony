import { Inject, Injectable } from "@nestjs/common";
import {
  GOAL_REPOSITORY,
  IGoalRepository,
  type CreateContributionData,
  type GoalContributionItem,
} from "../../domain/goal.repository.interface";
import { AuditService } from "../../../audit/audit.service";
import { DispatchNotificationUseCase } from "../../../notifications/application/use-cases/dispatch-notification.use-case";
import { NotificationDedupService } from "../../../notifications/application/notification-dedup.service";

@Injectable()
export class AddGoalContributionUseCase {
  constructor(
    @Inject(GOAL_REPOSITORY) private readonly goalRepo: IGoalRepository,
    private readonly auditService: AuditService,
    private readonly dispatch: DispatchNotificationUseCase,
    private readonly dedup: NotificationDedupService,
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

    await this.notifyIfGoalReached(goalId, householdId);

    return contribution;
  }

  /**
   * Meta atingida (M11) — event-driven, dedup 1×/meta (não por usuário: o
   * claim é household-scoped; o fan-out por destinatário é ortogonal e
   * resolvido pelo dispatcher). Se o aporte não cruzou o alvo, ou já
   * notificou antes, não faz nada.
   */
  private async notifyIfGoalReached(goalId: string, householdId: string): Promise<void> {
    const goal = await this.goalRepo.findById(goalId, householdId);
    if (!goal) return;

    const savedCents = await this.goalRepo.sumContributions(goalId);
    if (savedCents < goal.targetAmountCents) return;

    const claimed = await this.dedup.claim(householdId, "goal_reached", goalId, "once");
    if (!claimed) return;

    const memberIds = await this.goalRepo.findHouseholdMemberUserIds(householdId);
    await this.dispatch.execute({
      recipientUserIds: memberIds,
      householdId,
      type: "goal_reached",
      title: `Meta "${goal.name}" atingida! 🎉`,
      body: `Vocês guardaram ${(savedCents / 100).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
      })} — a meta de ${(goal.targetAmountCents / 100).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
      })} foi alcançada.`,
      data: { goalId },
    });
  }
}
