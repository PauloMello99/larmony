import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { GetMonthlyReportUseCase } from "./application/use-cases/get-monthly-report.use-case";
import { GetAnnualReportUseCase } from "./application/use-cases/get-annual-report.use-case";
import { ReportsInfrastructureModule } from "./infrastructure/reports-infrastructure.module";
import { ReportsController } from "./interface/reports.controller";

@Module({
  imports: [AuthModule, ReportsInfrastructureModule],
  controllers: [ReportsController],
  providers: [GetMonthlyReportUseCase, GetAnnualReportUseCase],
})
export class ReportsModule {}
