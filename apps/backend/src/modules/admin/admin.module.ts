import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { SubscriptionsInfrastructureModule } from "../subscriptions/infrastructure/subscriptions-infrastructure.module";
import { ADMIN_REPOSITORY } from "./domain/admin.repository.interface";
import { DrizzleAdminRepository } from "./infrastructure/drizzle-admin.repository";
import { GetPlatformStatsUseCase } from "./application/use-cases/get-platform-stats.use-case";
import { GetPlatformGrowthUseCase } from "./application/use-cases/get-platform-growth.use-case";
import { GetBillingStatsUseCase } from "./application/use-cases/get-billing-stats.use-case";
import { GetBillingGrowthUseCase } from "./application/use-cases/get-billing-growth.use-case";
import { ListPlatformHouseholdsUseCase } from "./application/use-cases/list-platform-households.use-case";
import { ListPlatformUsersUseCase } from "./application/use-cases/list-platform-users.use-case";
import { GetHouseholdDetailUseCase } from "./application/use-cases/get-household-detail.use-case";
import { GetUserDetailUseCase } from "./application/use-cases/get-user-detail.use-case";
import { ListHouseholdTransactionsUseCase } from "./application/use-cases/list-household-transactions.use-case";
import { ListHouseholdCategoriesUseCase } from "./application/use-cases/list-household-categories.use-case";
import { ListHouseholdBudgetsUseCase } from "./application/use-cases/list-household-budgets.use-case";
import { ListHouseholdGoalsUseCase } from "./application/use-cases/list-household-goals.use-case";
import { ListHouseholdScheduledEntriesUseCase } from "./application/use-cases/list-household-scheduled-entries.use-case";
import { ListHouseholdNotificationsUseCase } from "./application/use-cases/list-household-notifications.use-case";
import { SetHouseholdSuspendedUseCase } from "./application/use-cases/set-household-suspended.use-case";
import { ListAuditLogsUseCase } from "../audit/application/use-cases/list-audit-logs.use-case";
import { AdminController } from "./interface/admin.controller";

@Module({
  // SubscriptionsInfrastructureModule: PAYMENT_GATEWAY p/ a política de
  // suspensão (cancelar sub Stripe viva antes de suspender lar pago).
  imports: [AuthModule, SubscriptionsInfrastructureModule],
  controllers: [AdminController],
  providers: [
    { provide: ADMIN_REPOSITORY, useClass: DrizzleAdminRepository },
    GetPlatformStatsUseCase,
    GetPlatformGrowthUseCase,
    GetBillingStatsUseCase,
    GetBillingGrowthUseCase,
    ListPlatformHouseholdsUseCase,
    ListPlatformUsersUseCase,
    GetHouseholdDetailUseCase,
    GetUserDetailUseCase,
    ListHouseholdTransactionsUseCase,
    ListHouseholdCategoriesUseCase,
    ListHouseholdBudgetsUseCase,
    ListHouseholdGoalsUseCase,
    ListHouseholdScheduledEntriesUseCase,
    ListHouseholdNotificationsUseCase,
    SetHouseholdSuspendedUseCase,
    ListAuditLogsUseCase,
  ],
})
export class AdminModule {}
