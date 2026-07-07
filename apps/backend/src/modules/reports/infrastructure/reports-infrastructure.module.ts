import { Module } from "@nestjs/common";
import { DatabaseModule } from "../../../database/database.module";
import { REPORT_REPOSITORY } from "../domain/report.repository.interface";
import { DrizzleReportRepository } from "./persistence/drizzle-report.repository";

@Module({
  imports: [DatabaseModule],
  providers: [{ provide: REPORT_REPOSITORY, useClass: DrizzleReportRepository }],
  exports: [REPORT_REPOSITORY],
})
export class ReportsInfrastructureModule {}
