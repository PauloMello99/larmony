import { Inject, Injectable } from "@nestjs/common";
import {
  IReportRepository,
  REPORT_REPOSITORY,
  type AnnualReport,
} from "../../domain/report.repository.interface";

@Injectable()
export class GetAnnualReportUseCase {
  constructor(
    @Inject(REPORT_REPOSITORY) private readonly reportRepo: IReportRepository,
  ) {}

  execute(householdId: string, year: number): Promise<AnnualReport> {
    return this.reportRepo.getAnnualReport(householdId, year);
  }
}
