import { Inject, Injectable } from "@nestjs/common";
import {
  GOAL_REPOSITORY,
  IGoalRepository,
  type GoalListItem,
} from "../../domain/goal.repository.interface";

@Injectable()
export class ListGoalsUseCase {
  constructor(@Inject(GOAL_REPOSITORY) private readonly goalRepo: IGoalRepository) {}

  execute(householdId: string): Promise<GoalListItem[]> {
    return this.goalRepo.findAllByHousehold(householdId);
  }
}
