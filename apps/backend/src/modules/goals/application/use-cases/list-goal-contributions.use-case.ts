import { Inject, Injectable } from "@nestjs/common";
import {
  GOAL_REPOSITORY,
  IGoalRepository,
  type GoalContributionItem,
} from "../../domain/goal.repository.interface";

@Injectable()
export class ListGoalContributionsUseCase {
  constructor(@Inject(GOAL_REPOSITORY) private readonly goalRepo: IGoalRepository) {}

  execute(goalId: string, householdId: string): Promise<GoalContributionItem[]> {
    return this.goalRepo.findContributions(goalId, householdId);
  }
}
