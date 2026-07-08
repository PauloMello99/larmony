import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "../../auth/guards/auth.guard";
import { HouseholdMembershipGuard } from "../../auth/guards/household-membership.guard";
import { CurrentUser } from "../../auth/decorators/current-user.decorator";
import type { AuthUser } from "../../auth/application/ports/auth-provider.interface";
import { GetMeUseCase } from "../../user/application/use-cases/get-me.use-case";
import { ListGoalsUseCase } from "../application/use-cases/list-goals.use-case";
import { CreateGoalUseCase } from "../application/use-cases/create-goal.use-case";
import { UpdateGoalUseCase } from "../application/use-cases/update-goal.use-case";
import { DeleteGoalUseCase } from "../application/use-cases/delete-goal.use-case";
import { AddGoalContributionUseCase } from "../application/use-cases/add-goal-contribution.use-case";
import { ListGoalContributionsUseCase } from "../application/use-cases/list-goal-contributions.use-case";
import { DeleteGoalContributionUseCase } from "../application/use-cases/delete-goal-contribution.use-case";
import { CreateGoalDto } from "./dto/create-goal.dto";
import { UpdateGoalDto } from "./dto/update-goal.dto";
import { CreateContributionDto } from "./dto/create-contribution.dto";

@Controller("households/:householdId/goals")
@UseGuards(AuthGuard, HouseholdMembershipGuard)
export class GoalsController {
  constructor(
    private readonly getMe: GetMeUseCase,
    private readonly listGoals: ListGoalsUseCase,
    private readonly createGoal: CreateGoalUseCase,
    private readonly updateGoal: UpdateGoalUseCase,
    private readonly deleteGoal: DeleteGoalUseCase,
    private readonly addContribution: AddGoalContributionUseCase,
    private readonly listContributions: ListGoalContributionsUseCase,
    private readonly deleteContribution: DeleteGoalContributionUseCase,
  ) {}

  @Get()
  list(@Param("householdId", ParseUUIDPipe) householdId: string) {
    return this.listGoals.execute(householdId);
  }

  @Post()
  create(
    @Param("householdId", ParseUUIDPipe) householdId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateGoalDto,
  ) {
    return this.createGoal.execute(householdId, user.id, dto);
  }

  @Patch(":goalId")
  update(
    @Param("householdId", ParseUUIDPipe) householdId: string,
    @Param("goalId", ParseUUIDPipe) goalId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateGoalDto,
  ) {
    return this.updateGoal.execute(goalId, householdId, user.id, dto);
  }

  @Delete(":goalId")
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param("householdId", ParseUUIDPipe) householdId: string,
    @Param("goalId", ParseUUIDPipe) goalId: string,
    @CurrentUser() user: AuthUser,
  ) {
    await this.deleteGoal.execute(goalId, householdId, user.id);
  }

  @Get(":goalId/contributions")
  contributions(
    @Param("householdId", ParseUUIDPipe) householdId: string,
    @Param("goalId", ParseUUIDPipe) goalId: string,
  ) {
    return this.listContributions.execute(goalId, householdId);
  }

  @Post(":goalId/contributions")
  async contribute(
    @Param("householdId", ParseUUIDPipe) householdId: string,
    @Param("goalId", ParseUUIDPipe) goalId: string,
    @CurrentUser() authUser: AuthUser,
    @Body() dto: CreateContributionDto,
  ) {
    const user = await this.getMe.execute(authUser);
    return this.addContribution.execute(goalId, householdId, authUser.id, user.id, dto);
  }

  @Delete(":goalId/contributions/:contributionId")
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeContribution(
    @Param("householdId", ParseUUIDPipe) householdId: string,
    @Param("goalId", ParseUUIDPipe) goalId: string,
    @Param("contributionId", ParseUUIDPipe) contributionId: string,
    @CurrentUser() user: AuthUser,
  ) {
    await this.deleteContribution.execute(contributionId, goalId, householdId, user.id);
  }
}
