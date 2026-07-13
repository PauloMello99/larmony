import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { SubscriptionsModule } from "../subscriptions/subscriptions.module";
import { GetMonthlyReportUseCase } from "./application/use-cases/get-monthly-report.use-case";
import { GetAnnualReportUseCase } from "./application/use-cases/get-annual-report.use-case";
import { ExportMonthlyReportUseCase } from "./application/use-cases/export-monthly-report.use-case";
import { ExportAnnualReportUseCase } from "./application/use-cases/export-annual-report.use-case";
import { SendMonthlyReportUseCase } from "./application/use-cases/send-monthly-report.use-case";
import { MonthlyReportJob } from "./application/jobs/monthly-report.job";
import { ReportsInfrastructureModule } from "./infrastructure/reports-infrastructure.module";
import { ReportsController } from "./interface/reports.controller";

@Module({
  imports: [
    AuthModule,
    ReportsInfrastructureModule,
    NotificationsModule,
    SubscriptionsModule,
  ],
  controllers: [ReportsController],
  providers: [
    GetMonthlyReportUseCase,
    GetAnnualReportUseCase,
    ExportMonthlyReportUseCase,
    ExportAnnualReportUseCase,
    SendMonthlyReportUseCase,
    MonthlyReportJob,
  ],
})
export class ReportsModule {}
