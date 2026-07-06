import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { UserModule } from "../user/user.module";
import { GoalsInfrastructureModule } from "./infrastructure/goals-infrastructure.module";
import { ListGoalsUseCase } from "./application/use-cases/list-goals.use-case";
import { CreateGoalUseCase } from "./application/use-cases/create-goal.use-case";
import { UpdateGoalUseCase } from "./application/use-cases/update-goal.use-case";
import { DeleteGoalUseCase } from "./application/use-cases/delete-goal.use-case";
import { AddGoalContributionUseCase } from "./application/use-cases/add-goal-contribution.use-case";
import { ListGoalContributionsUseCase } from "./application/use-cases/list-goal-contributions.use-case";
import { DeleteGoalContributionUseCase } from "./application/use-cases/delete-goal-contribution.use-case";
import { GoalsController } from "./interface/goals.controller";

@Module({
  imports: [AuthModule, UserModule, GoalsInfrastructureModule],
  controllers: [GoalsController],
  providers: [
    ListGoalsUseCase,
    CreateGoalUseCase,
    UpdateGoalUseCase,
    DeleteGoalUseCase,
    AddGoalContributionUseCase,
    ListGoalContributionsUseCase,
    DeleteGoalContributionUseCase,
  ],
})
export class GoalsModule {}
