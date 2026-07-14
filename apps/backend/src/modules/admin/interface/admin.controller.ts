import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "../../auth/guards/auth.guard";
import { PlatformAdminGuard } from "../../auth/guards/platform-admin.guard";
import { CurrentUser } from "../../auth/decorators/current-user.decorator";
import { AuthUser } from "../../auth/application/ports/auth-provider.interface";
import { GetPlatformStatsUseCase } from "../application/use-cases/get-platform-stats.use-case";
import { GetPlatformGrowthUseCase } from "../application/use-cases/get-platform-growth.use-case";
import { ListPlatformHouseholdsUseCase } from "../application/use-cases/list-platform-households.use-case";
import { ListPlatformUsersUseCase } from "../application/use-cases/list-platform-users.use-case";
import { GetHouseholdDetailUseCase } from "../application/use-cases/get-household-detail.use-case";
import { GetUserDetailUseCase } from "../application/use-cases/get-user-detail.use-case";
import { ListHouseholdTransactionsUseCase } from "../application/use-cases/list-household-transactions.use-case";
import { ListHouseholdCategoriesUseCase } from "../application/use-cases/list-household-categories.use-case";
import { ListHouseholdBudgetsUseCase } from "../application/use-cases/list-household-budgets.use-case";
import { ListHouseholdGoalsUseCase } from "../application/use-cases/list-household-goals.use-case";
import { ListHouseholdScheduledEntriesUseCase } from "../application/use-cases/list-household-scheduled-entries.use-case";
import { ListHouseholdNotificationsUseCase } from "../application/use-cases/list-household-notifications.use-case";
import { SetHouseholdSuspendedUseCase } from "../application/use-cases/set-household-suspended.use-case";
import { SetUserPlatformRoleUseCase } from "../application/use-cases/set-user-platform-role.use-case";
import { ListAuditLogsUseCase } from "../../audit/application/use-cases/list-audit-logs.use-case";
import { SetSuspendedDto } from "./dto/set-suspended.dto";
import { SetPlatformRoleDto } from "./dto/set-platform-role.dto";
import { AuditLogsQueryDto } from "./dto/audit-logs-query.dto";
import { ListHouseholdsQueryDto } from "./dto/list-households-query.dto";
import { ListUsersQueryDto } from "./dto/list-users-query.dto";
import { PageQueryDto } from "./dto/page-query.dto";
import { ListHouseholdTransactionsQueryDto } from "./dto/list-household-transactions-query.dto";
import { ListHouseholdNotificationsQueryDto } from "./dto/list-household-notifications-query.dto";

/**
 * Painel da plataforma (PLAT-1). Rotas NÃO household-scoped, restritas ao super_admin
 * via {@link PlatformAdminGuard}.
 */
@Controller("admin")
@UseGuards(AuthGuard, PlatformAdminGuard)
export class AdminController {
  constructor(
    private readonly getStats: GetPlatformStatsUseCase,
    private readonly getGrowth: GetPlatformGrowthUseCase,
    private readonly listHouseholds: ListPlatformHouseholdsUseCase,
    private readonly listUsers: ListPlatformUsersUseCase,
    private readonly getHouseholdDetail: GetHouseholdDetailUseCase,
    private readonly getUserDetail: GetUserDetailUseCase,
    private readonly listHouseholdTransactions: ListHouseholdTransactionsUseCase,
    private readonly listHouseholdCategories: ListHouseholdCategoriesUseCase,
    private readonly listHouseholdBudgets: ListHouseholdBudgetsUseCase,
    private readonly listHouseholdGoals: ListHouseholdGoalsUseCase,
    private readonly listHouseholdScheduledEntries: ListHouseholdScheduledEntriesUseCase,
    private readonly listHouseholdNotifications: ListHouseholdNotificationsUseCase,
    private readonly setHouseholdSuspended: SetHouseholdSuspendedUseCase,
    private readonly setUserPlatformRole: SetUserPlatformRoleUseCase,
    private readonly listAuditLogs: ListAuditLogsUseCase,
  ) {}

  @Get("stats")
  stats() {
    return this.getStats.execute();
  }

  @Get("stats/growth")
  growth() {
    return this.getGrowth.execute();
  }

  @Get("households")
  households(@Query() query: ListHouseholdsQueryDto) {
    return this.listHouseholds.execute(query);
  }

  @Get("households/:id")
  householdDetail(@Param("id", ParseUUIDPipe) id: string) {
    return this.getHouseholdDetail.execute(id);
  }

  // ── Abas de drill-down (read-only, para investigação/suporte) ─────────────

  @Get("households/:id/transactions")
  householdTransactions(
    @Param("id", ParseUUIDPipe) id: string,
    @Query() query: ListHouseholdTransactionsQueryDto,
  ) {
    return this.listHouseholdTransactions.execute(id, query);
  }

  @Get("households/:id/categories")
  householdCategories(
    @Param("id", ParseUUIDPipe) id: string,
    @Query() query: PageQueryDto,
  ) {
    return this.listHouseholdCategories.execute(id, query);
  }

  @Get("households/:id/budgets")
  householdBudgets(
    @Param("id", ParseUUIDPipe) id: string,
    @Query() query: PageQueryDto,
  ) {
    return this.listHouseholdBudgets.execute(id, query);
  }

  @Get("households/:id/goals")
  householdGoals(
    @Param("id", ParseUUIDPipe) id: string,
    @Query() query: PageQueryDto,
  ) {
    return this.listHouseholdGoals.execute(id, query);
  }

  @Get("households/:id/scheduled-entries")
  householdScheduledEntries(
    @Param("id", ParseUUIDPipe) id: string,
    @Query() query: PageQueryDto,
  ) {
    return this.listHouseholdScheduledEntries.execute(id, query);
  }

  @Get("households/:id/notifications")
  householdNotifications(
    @Param("id", ParseUUIDPipe) id: string,
    @Query() query: ListHouseholdNotificationsQueryDto,
  ) {
    return this.listHouseholdNotifications.execute(id, query);
  }

  @Get("users")
  users(@Query() query: ListUsersQueryDto) {
    return this.listUsers.execute(query);
  }

  @Get("users/:id")
  userDetail(@Param("id", ParseUUIDPipe) id: string) {
    return this.getUserDetail.execute(id);
  }

  @Get("audit-logs")
  auditLogs(@Query() query: AuditLogsQueryDto) {
    return this.listAuditLogs.execute(query);
  }

  @Patch("households/:id/suspend")
  @HttpCode(HttpStatus.NO_CONTENT)
  async suspend(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: SetSuspendedDto,
    @CurrentUser() user: AuthUser,
  ) {
    await this.setHouseholdSuspended.execute(id, dto.suspended, user.id);
  }

  @Patch("users/:id/platform-role")
  @HttpCode(HttpStatus.NO_CONTENT)
  async platformRole(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: SetPlatformRoleDto,
    @CurrentUser() user: AuthUser,
  ) {
    await this.setUserPlatformRole.execute(id, dto.role, user.id);
  }
}
