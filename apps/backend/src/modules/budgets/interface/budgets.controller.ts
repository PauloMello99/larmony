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
import { HouseholdEntitlementGuard } from "../../subscriptions/interface/guards/household-entitlement.guard";
import { RequireCapability } from "../../subscriptions/interface/decorators/require-capability.decorator";
import { CurrentUser } from "../../auth/decorators/current-user.decorator";
import type { AuthUser } from "../../auth/application/ports/auth-provider.interface";
import { ListBudgetsUseCase } from "../application/use-cases/list-budgets.use-case";
import { CreateBudgetUseCase } from "../application/use-cases/create-budget.use-case";
import { UpdateBudgetUseCase } from "../application/use-cases/update-budget.use-case";
import { DeleteBudgetUseCase } from "../application/use-cases/delete-budget.use-case";
import { CreateBudgetDto } from "./dto/create-budget.dto";
import { UpdateBudgetDto } from "./dto/update-budget.dto";
import { ListBudgetsQueryDto } from "./dto/list-budgets-query.dto";

// Orçamentos são uma feature Completo (M16): o gate de capability a nível de
// classe bloqueia Essencial e locked em TODAS as rotas (inclusive GET) com 402
// PREMIUM_REQUIRED — Essencial não enxerga orçamentos.
@Controller("households/:householdId/budgets")
@RequireCapability("budgets")
@UseGuards(AuthGuard, HouseholdMembershipGuard, HouseholdEntitlementGuard)
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
    // Default de mês/ano (fuso do lar) resolvido no use-case — ver M12/ADR-0024.
    return this.listBudgets.execute(householdId, query.month, query.year);
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
