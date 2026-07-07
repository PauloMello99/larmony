import { Inject, Injectable } from "@nestjs/common";
import {
  IReportRepository,
  REPORT_REPOSITORY,
  type MonthlyReport,
} from "../../domain/report.repository.interface";

@Injectable()
export class GetMonthlyReportUseCase {
  constructor(
    @Inject(REPORT_REPOSITORY) private readonly reportRepo: IReportRepository,
  ) {}

  execute(householdId: string, now = new Date()): Promise<MonthlyReport> {
    return this.reportRepo.getMonthlyReport(householdId, now);
  }
}
