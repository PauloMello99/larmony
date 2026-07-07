import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_GUARD, APP_INTERCEPTOR } from "@nestjs/core";
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler";
import { DatabaseModule } from "./database/database.module";
import { AppCacheModule } from "./common/cache/cache.module";
import { RlsInterceptor } from "./common/interceptors/rls.interceptor";
import { AuthModule } from "./modules/auth/auth.module";
import { HealthModule } from "./modules/health/health.module";
import { HouseholdsModule } from "./modules/households/households.module";
import { NotificationsModule } from "./modules/notifications/notifications.module";
import { AdminModule } from "./modules/admin/admin.module";
import { AuditModule } from "./modules/audit/audit.module";
import { BillsModule } from "./modules/bills/bills.module";
import { CategoriesModule } from "./modules/categories/categories.module";
import { TransactionsModule } from "./modules/transactions/transactions.module";
import { BudgetsModule } from "./modules/budgets/budgets.module";
import { GoalsModule } from "./modules/goals/goals.module";
import { ReportsModule } from "./modules/reports/reports.module";
import { InternalCronModule } from "./modules/internal-cron/internal-cron.module";
import { TelemetryModule } from "./common/telemetry/telemetry.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TelemetryModule,
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    AppCacheModule,
    DatabaseModule,
    AuthModule,
    HealthModule,
    HouseholdsModule,
    NotificationsModule,
    AdminModule,
    AuditModule,
    BillsModule,
    CategoriesModule,
    TransactionsModule,
    BudgetsModule,
    GoalsModule,
    ReportsModule,
    InternalCronModule,
  ],
  providers: [
    { provide: APP_INTERCEPTOR, useClass: RlsInterceptor },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
