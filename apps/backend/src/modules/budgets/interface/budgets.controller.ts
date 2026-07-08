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
  Query,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "../../auth/guards/auth.guard";
import { HouseholdMembershipGuard } from "../../auth/guards/household-membership.guard";
import { CurrentUser } from "../../auth/decorators/current-user.decorator";
import type { AuthUser } from "../../auth/application/ports/auth-provider.interface";
import { ListBudgetsUseCase } from "../application/use-cases/list-budgets.use-case";
import { CreateBudgetUseCase } from "../application/use-cases/create-budget.use-case";
import { UpdateBudgetUseCase } from "../application/use-cases/update-budget.use-case";
import { DeleteBudgetUseCase } from "../application/use-cases/delete-budget.use-case";
import { CreateBudgetDto } from "./dto/create-budget.dto";
import { UpdateBudgetDto } from "./dto/update-budget.dto";
import { ListBudgetsQueryDto } from "./dto/list-budgets-query.dto";

@Controller("households/:householdId/budgets")
@UseGuards(AuthGuard, HouseholdMembershipGuard)
export class BudgetsController {
  constructor(
    private readonly listBudgets: ListBudgetsUseCase,
    private readonly createBudget: CreateBudgetUseCase,
    private readonly updateBudget: UpdateBudgetUseCase,
    private readonly deleteBudget: DeleteBudgetUseCase,
  ) {}

  @Get()
  list(
    @Param("householdId", ParseUUIDPipe) householdId: string,
    @Query() query: ListBudgetsQueryDto,
  ) {
    const now = new Date();
    const month = query.month ?? now.getMonth() + 1;
    const year = query.year ?? now.getFullYear();
    return this.listBudgets.execute(householdId, month, year);
  }

  @Post()
  create(
    @Param("householdId", ParseUUIDPipe) householdId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateBudgetDto,
  ) {
    return this.createBudget.execute(householdId, user.id, dto);
  }

  @Patch(":budgetId")
  update(
    @Param("householdId", ParseUUIDPipe) householdId: string,
    @Param("budgetId", ParseUUIDPipe) budgetId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateBudgetDto,
  ) {
    return this.updateBudget.execute(budgetId, householdId, user.id, dto.amountCents);
  }

  @Delete(":budgetId")
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param("householdId", ParseUUIDPipe) householdId: string,
    @Param("budgetId", ParseUUIDPipe) budgetId: string,
    @CurrentUser() user: AuthUser,
  ) {
    await this.deleteBudget.execute(budgetId, householdId, user.id);
  }
}
