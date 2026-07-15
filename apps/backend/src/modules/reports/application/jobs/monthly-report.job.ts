import { Injectable } from "@nestjs/common";
import { CronJob, CronJobName } from "../../../internal-cron/cron-job";
import { SendMonthlyReportUseCase } from "../use-cases/send-monthly-report.use-case";

/** Plugado no tick do internal-cron via registry (ver cron-job.ts). */
@CronJobName("monthly-report")
@Injectable()
export class MonthlyReportJob implements CronJob {
  constructor(private readonly useCase: SendMonthlyReportUseCase) {}

  run(): Promise<unknown> {
    return this.useCase.execute();
  }
}
